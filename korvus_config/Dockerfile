
# Korvus API — for Cloud Run
FROM python:3.11-slim

WORKDIR /app
COPY korvus_config/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY korvus_config/ .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
