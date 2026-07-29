"""Base de usuarios "mock", hardcodeada en memoria (sin base de datos)."""

from app.auth.schemas import UserPublic

# username -> datos del usuario, incluida la password en texto plano.
# Requisito explicito de la prueba: usuarios hardcodeados, sin hashing.
# En un sistema real la password NUNCA se guarda ni compara en texto plano.
_MOCK_USERS_DB = {
    "admin": {"username": "admin", "password": "admin123", "role": "ADMIN"},
    "user": {"username": "user", "password": "user123", "role": "USER"},
}


def authenticate_user(username: str, password: str) -> UserPublic | None:
    """Valida credenciales. Devuelve el usuario si son correctas, None si no."""
    record = _MOCK_USERS_DB.get(username)
    if record is None or record["password"] != password:
        return None
    return UserPublic(username=record["username"], role=record["role"])


def get_user(username: str) -> UserPublic | None:
    """Busca un usuario por username, sin validar password (para reconstruir
    el usuario a partir del 'sub' de un token ya verificado)."""
    record = _MOCK_USERS_DB.get(username)
    if record is None:
        return None
    return UserPublic(username=record["username"], role=record["role"])
