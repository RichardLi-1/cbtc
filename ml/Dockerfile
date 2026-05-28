FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV RLCBTC_POLICY_PATH=/app/models/deployed/ppo_baseline/policy.zip
EXPOSE 8001
CMD ["python", "-m", "rlcbtc.cli.serve_training", "--host", "0.0.0.0", "--port", "8001"]
