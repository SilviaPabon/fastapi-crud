from typing import Literal

from pydantic import BaseModel

Role = Literal["ADMIN", "USER"]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos de vida del token, informativo para el frontend


class UserPublic(BaseModel):
    username: str
    role: Role
