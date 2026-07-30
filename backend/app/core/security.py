"""Creacion y verificacion de JWT (JSON Web Tokens)."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)


def create_access_token(username: str, role: str) -> tuple[str, int]:
    """Genera un access token firmado.

    Claims incluidos:
    - sub: identifica al usuario (username)
    - role: usado luego para las reglas ADMIN/USER
    - jti: id unico del token, necesario para poder invalidarlo en /logout
    - iat / exp: emision y expiracion (15 minutos, requisito de la prueba)

    Devuelve el token junto con su tiempo de vida en segundos, para que el
    endpoint de login pueda informarlo al frontend.
    """
    now = datetime.now(timezone.utc)
    expire_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "role": role,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + expire_delta,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, int(expire_delta.total_seconds())


def decode_access_token(token: str) -> dict:
    """Decodifica y valida la firma + expiracion del token.

    Sirve tanto para access tokens como refresh tokens (misma firma/algoritmo):
    quien llama distingue cual es por el claim "type". Deja que
    jwt.ExpiredSignatureError y jwt.InvalidTokenError se propaguen: quien
    llama (app/auth/dependencies.py, app/auth/router.py) decide como
    traducirlos a HTTP 401.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def create_refresh_token(username: str) -> tuple[str, str, int]:
    """Genera un refresh token firmado, de vida mas larga que el access token.

    Lleva "type": "refresh" para que nadie pueda usarlo como si fuera un
    access token normal (se valida explicitamente en /auth/refresh). El jti
    se usa para poder invalidarlo/rotarlo del lado del servidor.

    Devuelve (token, jti, expires_in_segundos).
    """
    now = datetime.now(timezone.utc)
    expire_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid4())
    payload = {
        "sub": username,
        "type": "refresh",
        "jti": jti,
        "iat": now,
        "exp": now + expire_delta,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti, int(expire_delta.total_seconds())
