# --- E.Practice backend Dockerfile (V0) ---
# Boot:
#   docker compose up --build         (via docker-compose.yml della root)
#   docker build -t epractice-backend:v0 backend/
#   docker run -p 8000:8000 epractice-backend:v0

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# curl serve per healthcheck. build-essential NON serve per V0 (no compilazioni native).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Layer cache: deps prima del codice. requirements.txt cambia raramente,
# i sorgenti dell'app cambiano spesso → pip install resta cached.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Copia solo l'app (escludi .venv, __pycache__ ecc. via .dockerignore).
COPY app/ ./app/

EXPOSE 8000

# Healthcheck allineato a docker-compose.yml (GET /healthz → 200).
HEALTHCHECK --interval=15s --timeout=3s --retries=5 --start-period=10s \
    CMD curl -fsS http://localhost:8000/healthz || exit 1

# In dev: docker-compose.yml override-a CMD con --reload per il live-reload.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
