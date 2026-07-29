"""Dependencias de FastAPI que implementan la autenticacion (401) y la
autorizacion por rol (403).

Se usan con `Depends(...)` en cada endpoint que se quiera proteger.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.schemas import UserPublic
from app.auth.users import get_user
from app.core.security import decode_access_token

# HTTPBearer es el esquema de seguridad de FastAPI que lee el header
# "Authorization: Bearer <token>". Por defecto, si el header no viene,
# HTTPBearer devuelve 403 automaticamente (comportamiento propio de FastAPI).
# El requisito de esta prueba es responder SIEMPRE 401 cuando el token esta
# ausente, es invalido o expiro, asi que se desactiva ese auto_error con
# auto_error=False y se lanza el 401 nosotros mismos mas abajo.
_bearer_scheme = HTTPBearer(auto_error=False)

# Blacklist en memoria de tokens invalidados por /auth/logout. Se guarda el
# "jti" (id unico de cada token) en vez del token completo. Al ser en
# memoria, se resetea si el servidor se reinicia (aceptable: no hay BD).
_revoked_jtis: set[str] = set()


def revoke_token(jti: str) -> None:
    _revoked_jtis.add(jti)


def get_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    """Valida el token y devuelve su payload decodificado.

    Cubre los 3 casos de 401 que pide la prueba:
    - token ausente        -> credentials es None
    - token invalido        -> jwt.InvalidTokenError (firma o formato incorrectos)
    - token expirado        -> jwt.ExpiredSignatureError
    - token revocado (logout) -> jti presente en _revoked_jtis
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("jti") in _revoked_jtis:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def get_current_user(payload: dict = Depends(get_token_payload)) -> UserPublic:
    """Reconstruye el usuario autenticado a partir del 'sub' del token.

    Se apoya en get_token_payload, asi que hereda automaticamente el 401
    en cualquiera de sus casos antes de llegar aqui.
    """
    user = get_user(payload.get("sub", ""))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(*allowed_roles: str):
    """Fabrica de dependencias para autorizacion por rol (403).

    Uso: Depends(require_role("ADMIN")) en un endpoint. Primero exige un
    usuario autenticado (get_current_user -> 401 si no lo hay) y luego
    verifica que su rol este en la lista permitida; si no, 403 Forbidden.
    """

    def _checker(user: UserPublic = Depends(get_current_user)) -> UserPublic:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not allowed to perform this action",
            )
        return user

    return _checker
