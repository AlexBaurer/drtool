from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from google.oauth2 import id_token
from google.auth.transport import requests
from starlette.config import Config
from starlette.requests import Request
import httpx

# Создаем роутер
router = APIRouter(prefix="/auth")

# Настройка OAuth
config_data = {
    "GOOGLE_CLIENT_ID": "144136712047-sc4icsbs627r8kgflbosrh17udfsmhqn.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "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",
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
        user = {
            'email': id_info['email'],
            'name': id_info['name'],
            'picture': id_info['picture'],
            'given_name': id_info['given_name'],
            'family_name': id_info['family_name']
        }
    # Здесь можно сохранить пользователя в сессии или базе данных
        request.session['user'] = user
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