# Image Python officielle légère
FROM python:3.10-slim

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Installation des outils système pour PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copie du code (sera surchargé par le volume Docker en dev, mais nécessaire pour la prod)
COPY ./app ./app

# Création d'un utilisateur non-root pour la sécurité
RUN useradd -m unitime_user
USER unitime_user

EXPOSE 8000

# Démarrage avec rechargement à chaud (Hot Reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]