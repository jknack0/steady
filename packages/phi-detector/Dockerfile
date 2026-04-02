FROM python:3.11-slim AS base

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download ML model at build time so it's cached in the image
RUN python -c "from transformers import AutoTokenizer, AutoModelForTokenClassification; \
    AutoTokenizer.from_pretrained('obi/deid_roberta_i2b2'); \
    AutoModelForTokenClassification.from_pretrained('obi/deid_roberta_i2b2')"

# Copy app code
COPY . .

# Non-root user
RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 app && \
    chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
