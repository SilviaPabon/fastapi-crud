import jwt
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import (
    get_token_payload,
    pop_refresh_token,
    revoke_refresh_token,
    revoke_token,
    store_refresh_token,
)
from app.auth.schemas import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.auth.users import authenticate_user, get_user
from app.core.security import create_access_token, create_refresh_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(username: str, role: str) -> TokenResponse:
    access_token, expires_in = create_access_token(username=username, role=role)
    refresh_token, refresh_jti, _ = create_refresh_token(username=username)
    store_refresh_token(refresh_jti, username)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in)


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest) -> TokenResponse:
    user = authenticate_user(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return _issue_tokens(user.username, user.role)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest) -> TokenResponse:
    """Cambia un refresh token vigente por un access token nuevo.

    Rota el refresh token en el mismo paso (pop_refresh_token lo invalida al
    leerlo): cada refresh token sirve una sola vez, lo que limita el dano si
    alguien lo llega a capturar (un reuso del mismo token ya rotado falla).
    """
    try:
        token_payload = decode_access_token(payload.refresh_token)
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

    return _issue_tokens(user.username, user.role)


@router.post("/logout")
def logout(payload: LogoutRequest | None = None, token_payload: dict = Depends(get_token_payload)) -> dict:
    # token_payload ya viene validado (401 si el access token era
    # ausente/invalido/expirado). Se revoca su jti para que deje de servir.
    revoke_token(token_payload["jti"])

    # Si el frontend tambien manda el refresh token, se revoca aqui: sin
    # esto, un refresh token todavia vigente seguiria pudiendo generar
    # access tokens nuevos despues del logout.
    if payload and payload.refresh_token:
        try:
            refresh_payload = decode_access_token(payload.refresh_token)
            revoke_refresh_token(refresh_payload.get("jti", ""))
        except jwt.PyJWTError:
            pass

    return {"message": "Logged out successfully"}
