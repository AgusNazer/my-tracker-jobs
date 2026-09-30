FROM python:3.12-slim

WORKDIR /app

# Copia el script al contenedor
COPY calculator.py .

# Ejecuta el script en modo interactivo sin buffering en stdout
ENV PYTHONUNBUFFERED=1

CMD ["python", "calculator.py"]