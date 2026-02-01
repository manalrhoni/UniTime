from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# URL de connexion (utilise les identifiants du docker-compose.yml)
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://unitime_user:unitime_password@db:5432/unitime_db"
)

# Création du moteur
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Création de la session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
Base = declarative_base()

# Dépendance pour récupérer la DB dans les endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()