FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependencias del sistema necesarias para compilar paquetes Python si hacen falta
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependencias Python
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copia el resto del código
COPY . .

# Puerto expuesto por la aplicación
EXPOSE 8080

# Comando por defecto: ajustar `main:app` si tu aplicación usa otro módulo/variable
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
