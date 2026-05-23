from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("SUPABASE_DATABASE_URL")
    or os.getenv("SUPABASE_DB_URL")
)

print("=== DATABASE_URL EN USO ETO ===", DATABASE_URL)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada para ETO")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    connect_args={
        "options": os.getenv("DB_OPTIONS", "-csearch_path=eto_digital,public")
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
