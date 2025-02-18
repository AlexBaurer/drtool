from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from google.oauth2 import id_token
from google.auth.transport import requests
from starlette.config import Config
from starlette.requests import Request
import httpx
from dotenv import load_dotenv
import os
from app.db import async_session_maker
from sqlalchemy.exc import SQLAlchemyError
from app.cards.models import User

load_dotenv()

# Создаем роутер
router = APIRouter(prefix="/auth")

# Настройка OAuth
config_data = {
    "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID"),
    "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET"),
    "GOOGLE_REDIRECT_URI": "http://localhost:8000/auth/google/callback",
}
config = Config(environ=config_data)
oauth = OAuth(config)
oauth.register(
    name='google',
    client_id=config_data["GOOGLE_CLIENT_ID"],
    client_secret=config_data["GOOGLE_CLIENT_SECRET"],
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    refresh_token_url=None,
    redirect_uri=config_data["GOOGLE_REDIRECT_URI"],
    client_kwargs={'scope': 'openid profile email'},
)

# Эндпоинт для начала авторизации
@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = config_data["GOOGLE_REDIRECT_URI"]
    # print(f"login in: {oauth.google.authorize_redirect(request, redirect_uri)}")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_auth_callback(code: str, request: Request):
    token_request_uri = "https://oauth2.googleapis.com/token"

    data = {
        'code': code,
        'client_id': config_data["GOOGLE_CLIENT_ID"],
        'client_secret': config_data["GOOGLE_CLIENT_SECRET"],
        'redirect_uri': request.url_for('google_auth_callback'),
        'grant_type': 'authorization_code',
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_request_uri, data=data)
        response.raise_for_status()
        token_response = response.json()

    id_token_value = token_response.get('id_token')
    if not id_token_value:
        raise HTTPException(status_code=400, detail="Missing id_token in response.")

    try:
        id_info = id_token.verify_oauth2_token(id_token_value, requests.Request(), config_data["GOOGLE_CLIENT_ID"])
        user_session = {
            'email': id_info['email'],
            'name': id_info['name'],
            'auth_method': 'google'
        }
        # Добавление юзера в бд
        bd_user = User(
            email=id_info['email'],
            name=id_info['name'],
            full_real_name=f'{id_info['family_name']} {id_info['given_name']}',
            auth_method='google'
        )
        try:
            async with async_session_maker() as session:
                session.add(bd_user)
                await session.commit()
        except SQLAlchemyError as e:
            error = str(e.__cause__)
            print(error)

        request.session['user'] = user_session
        return RedirectResponse(url="/")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid id_token: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Эндпоинт для выхода
@router.get("/logout")
async def google_logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url="/")

# Защищенный эндпоинт
@router.get("/google/profile")
async def google_profile(request: Request):
    user = request.session.get('user')
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return {"user": user}