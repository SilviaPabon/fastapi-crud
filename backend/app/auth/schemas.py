from typing import Literal

from pydantic import BaseModel

Role = Literal["ADMIN", "USER"]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos de vida del access token, informativo para el frontend


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    # Opcional: si el frontend lo manda, tambien se revoca del lado del
    # servidor (ademas del access token, que ya se revoca via el header).
    refresh_token: str | None = None


class UserPublic(BaseModel):
    username: str
    role: Role
