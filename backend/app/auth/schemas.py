from typing import Literal

from pydantic import BaseModel

Role = Literal["ADMIN", "USER"]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    # El refresh_token NO va aqui: viaja como cookie HttpOnly (ver
    # app/auth/router.py), invisible para JS en el frontend.
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos de vida del access token, informativo para el frontend


class UserPublic(BaseModel):
    username: str
    role: Role
