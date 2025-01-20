from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.requests import Request
import httpx
from dotenv import load_dotenv
import os
from app.db import async_session_maker
from sqlalchemy.exc import SQLAlchemyError
from app.cards.models import User

load_dotenv()

router = APIRouter(prefix="/auth")

# Настройка OAuth для Yandex
config_data = {
    "YANDEX_CLIENT_ID": os.getenv("YANDEX_CLIENT_ID"),
    "YANDEX_CLIENT_SECRET": os.getenv("YANDEX_CLIENT_SECRET"),
    "YANDEX_REDIRECT_URI": "http://localhost:8000/auth/ya/callback",
}
config = Config(environ=config_data)
oauth = OAuth(config)
oauth.register(
    name='yandex',
    client_id=config_data["YANDEX_CLIENT_ID"],
    client_secret=config_data["YANDEX_CLIENT_SECRET"],
    authorize_url='https://oauth.yandex.ru/authorize',
    authorize_params=None,
    access_token_url='https://oauth.yandex.ru/token',
    access_token_params=None,
    refresh_token_url=None,
    redirect_uri=config_data["YANDEX_REDIRECT_URI"],
    client_kwargs={'scope': 'login:email login:info',
                   'token_endpoint_auth_method': 'client_secret_post',},
    jwks_uri='https://oauth.yandex.ru/keys',
    issuer='https://oauth.yandex.ru',
)

# Эндпоинт для начала авторизации через Yandex
@router.get("/ya/login")
async def yandex_login(request: Request):
    redirect_uri = config_data["YANDEX_REDIRECT_URI"]
    return await oauth.yandex.authorize_redirect(request, redirect_uri)

# Эндпоинт для обработки callback от Yandex
@router.get("/ya/callback")
async def yandex_callback(request: Request):
    try:
        print("Request query parameters:", request.query_params)
        code = request.query_params.get("code")
        if not code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")

        # Вручную получаем токен доступа
        async with httpx.AsyncClient() as client:
            # Запрос токена доступа
            token_response = await client.post(
                "https://oauth.yandex.ru/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": config_data["YANDEX_CLIENT_ID"],
                    "client_secret": config_data["YANDEX_CLIENT_SECRET"],
                    "redirect_uri": config_data["YANDEX_REDIRECT_URI"],
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            print("Token response:", token_response.text)
            token = token_response.json()
            if "access_token" not in token:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Failed to fetch access token")

            # Запрос информации о пользователе
            userinfo_response = await client.get(
                "https://login.yandex.ru/info",
                params={"format": "json"},  # Указываем формат JSON
                headers={"Authorization": f"OAuth {token['access_token']}"},
            )
            print("Userinfo response:", userinfo_response.text)
            userinfo = userinfo_response.json()
            if not userinfo:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Failed to fetch user info")

        # Сохраняем пользователя в сессии
        request.session['user'] = userinfo
        print('userinfoJson____', userinfo)
        # Добавление юзера в бд
        bd_user = User(
            email=userinfo['default_email'],
            name=userinfo['login'],
            full_real_name=userinfo['real_name'],
            auth_method='yandex'
        )
        try:
            async with async_session_maker() as session:
                session.add(bd_user)
                await session.commit()
        except SQLAlchemyError as e:
            error = str(e.__cause__)
            print(error)

        return RedirectResponse(url="/")

    except Exception as e:
        print("Error during Yandex auth callback:", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Эндпоинт для выхода
@router.get("/logout")
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url="/")

# Защищенный эндпоинт
@router.get("/ya/profile")
async def profile(request: Request):
    user = request.session.get('user')
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return {"user": user}