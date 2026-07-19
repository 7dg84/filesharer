# --- Etapa 1: Compilación del Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Etapa 2: Servidor Backend Express ---
FROM node:20-alpine
WORKDIR /app

# Copiar configuración del backend
COPY backend/package*.json ./
RUN npm install --only=production

# Copiar código del backend
COPY backend/ ./

# Copiar el frontend compilado a la carpeta public del backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Crear directorio para la base de datos de SQLite
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "src/index.js"]
