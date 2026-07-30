import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.auth.dependencies import (
    get_token_payload,
    pop_refresh_token,
    revoke_refresh_token,
    revoke_token,
    store_refresh_token,
)
from app.auth.schemas import LoginRequest, TokenResponse
from app.auth.users import authenticate_user, get_user
from app.core.config import REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, REFRESH_TOKEN_EXPIRE_DAYS
from app.core.security import create_access_token, create_refresh_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

_REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    # httponly=True: JS no puede leerla (mitiga robo por XSS).
    # samesite="lax": el navegador solo la manda en requests same-site, que
    # es el caso aqui gracias al proxy de Vite (ver frontend/vite.config.ts):
    # el frontend en dev llama a rutas relativas que Vite reenvia al backend,
    # asi que para el navegador todo ocurre en el mismo origen.
    # secure=False porque en este entorno se corre sobre http local; en
    # produccion (https) deberia ser True.
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=_REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,
        path=REFRESH_COOKIE_PATH,
    )


def _issue_tokens(response: Response, username: str, role: str) -> TokenResponse:
    access_token, expires_in = create_access_token(username=username, role=role)
    refresh_token, refresh_jti, _ = create_refresh_token(username=username)
    store_refresh_token(refresh_jti, username)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, response: Response) -> TokenResponse:
    user = authenticate_user(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return _issue_tokens(response, user.username, user.role)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response) -> TokenResponse:
    """Cambia el refresh token de la cookie por un access token nuevo.

    Rota el refresh token en el mismo paso (pop_refresh_token lo invalida al
    leerlo, y se sobreescribe la cookie con uno nuevo): cada refresh token
    sirve una sola vez, lo que limita el dano si alguien lo llega a capturar
    (un reuso del mismo token ya rotado falla).
    """
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        token_payload = decode_access_token(raw_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    username = pop_refresh_token(token_payload.get("jti", ""))
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalid, expired or already used",
        )

    user = get_user(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return _issue_tokens(response, user.username, user.role)


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    token_payload: dict = Depends(get_token_payload),
) -> dict:
    # token_payload ya viene validado (401 si el access token era
    # ausente/invalido/expirado). Se revoca su jti para que deje de servir.
    revoke_token(token_payload["jti"])

    # Tambien se revoca el refresh token de la cookie (si vino): sin esto,
    # seguiria vigente y podria generar access tokens nuevos despues del
    # logout. Se borra la cookie del lado del navegador en cualquier caso.
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        try:
            refresh_payload = decode_access_token(raw_token)
            revoke_refresh_token(refresh_payload.get("jti", ""))
        except jwt.PyJWTError:
            pass
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)

    return {"message": "Logged out successfully"}
