"""Creacion y verificacion de JWT (JSON Web Tokens)."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY


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

    Deja que jwt.ExpiredSignatureError y jwt.InvalidTokenError se propaguen:
    quien llama (app/auth/dependencies.py) decide como traducirlos a HTTP 401.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
