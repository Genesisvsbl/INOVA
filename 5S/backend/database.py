import os

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("SUPABASE_DATABASE_URL")
    or os.getenv("SUPABASE_DB_URL")
)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no esta configurada")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def safe_database_label(url: str) -> str:
    try:
        return make_url(url).render_as_string(hide_password=True)
    except Exception:
        return "base de datos configurada"


engine_options = {
    "echo": os.getenv("SQLALCHEMY_ECHO", "").lower() == "true",
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options["pool_recycle"] = int(os.getenv("SQLALCHEMY_POOL_RECYCLE", "300"))
    engine_options["connect_args"] = {
        "options": os.getenv("DB_OPTIONS", '-csearch_path="5s",public')
    }

print("=== DATABASE_URL 5S EN USO ===", safe_database_label(DATABASE_URL))

engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
