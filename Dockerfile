# Multi-stage build: Frontend + Backend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY main.py ./
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8008
CMD ["python", "main.py"]
