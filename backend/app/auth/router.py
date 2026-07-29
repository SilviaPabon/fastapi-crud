from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_token_payload, revoke_token
from app.auth.schemas import LoginRequest, TokenResponse
from app.auth.users import authenticate_user
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest) -> TokenResponse:
    user = authenticate_user(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token, expires_in = create_access_token(username=user.username, role=user.role)
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.post("/logout")
def logout(payload: dict = Depends(get_token_payload)) -> dict:
    # payload ya viene validado (401 si el token era ausente/invalido/expirado).
    # Solo queda marcar su jti como revocado para que deje de servir.
    revoke_token(payload["jti"])
    return {"message": "Logged out successfully"}
