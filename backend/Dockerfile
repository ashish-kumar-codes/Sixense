FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY frontend/dist ./frontend/dist

# Build data on first boot so a fresh container always has a dataset,
# then start the API. graph_service.py loads it into Neo4j (or falls
# back to in-memory) at import time.
CMD ["sh", "-c", "python -m app.data_generator && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
