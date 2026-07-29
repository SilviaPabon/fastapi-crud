"""Configuracion central de la aplicacion.

Todo lo que normalmente iria en variables de entorno (.env) esta aqui
hardcodeado porque es una prueba tecnica sin base de datos ni despliegue real.
En un proyecto real, SECRET_KEY jamas deberia vivir en el codigo fuente.
"""

# Clave usada para firmar y verificar los JWT (algoritmo simetrico HS256).
# Quien la conozca puede fabricar tokens validos: en produccion viene de
# una variable de entorno / secret manager, nunca del codigo.
SECRET_KEY = "dev-secret-key-change-me-in-production"
ALGORITHM = "HS256"

# Vida util del access token, en minutos. Requisito de la prueba: 15 min.
ACCESS_TOKEN_EXPIRE_MINUTES = 15

# Origenes permitidos por CORS para que el frontend (Vite) pueda llamar a la API.
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
