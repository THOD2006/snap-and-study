
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-10000} app:app"]
