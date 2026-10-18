# Filesharer & Shortener

Una aplicación web moderna, segura y de diseño premium para acortar enlaces y compartir archivos, completamente contenedorizada en Docker y lista para ser expuesta al público con un túnel de Cloudflare. 

Esta solución cuenta con organización por carpetas y etiquetas, permitiendo gestionar enlaces y almacenamiento físico mediante firmas temporales de S3 en un entorno autohospedado (self-hosted).

---

## Características

- 🔗 **Acortador de URLs**: Crea enlaces cortos con un nombre descriptivo y monitorea el número de clics en tiempo real. Redirecciona instantáneamente mediante el prefijo `/s/:code`.
- 📁 **Gestor de Archivos (MinIO)**: Sube y descarga archivos de manera segura directamente a MinIO mediante firmas temporales (Presigned URLs) con seguimiento del progreso de subida.
- 🗂️ **Carpetas**: Agrupa tus enlaces y archivos en directorios virtuales separados según el módulo correspondiente.
- 🏷️ **Etiquetas (Tags)**: Clasifica transversalmente tu contenido con etiquetas coloridas generadas dinámicamente según el nombre del tag.
- 🔍 **Filtros Avanzados**: Filtrado inmediato de tablas mediante buscador en tiempo real y selectores de carpeta o etiqueta.
- 🌓 **Modo Oscuro / Claro**: Interfaz premium con soporte de tema claro y oscuro que respeta tus preferencias y se adapta con transiciones fluidas.
- 🔒 **Acceso Protegido**: Acceso con usuario y contraseña protegido por JWT (JSON Web Tokens) guardados en cookies HTTP-only.
- 🐋 **Dockerizado**: Configurado en Docker Compose listo para ejecutarse en cualquier entorno con una base de datos SQLite integrada.
- ☁️ **Cloudflare Tunnel**: Servicio integrado para exponer tu aplicación local de forma segura a internet sin necesidad de abrir puertos (CGNAT bypass) usando HTTPS automático.

---

## Requisitos Previos

- [Docker](https://www.docker.com/) y [Docker Compose](https://docs.docker.com/compose/) instalados en tu sistema.
- Un token de túnel de Cloudflare (opcional, para exponer a internet).

---

## Estructura del Proyecto

```text
/filesharer
├── backend/
│   ├── src/
│   │   ├── config/           # Configuración de base de datos SQLite y clientes de MinIO
│   │   ├── controllers/      # Controladores de auth, urls, archivos y carpetas
│   │   ├── middleware/       # Autenticación segura mediante JWT
│   │   ├── routes/           # Rutas expuestas de la API REST
│   │   └── index.js          # Entrada del servidor y redirección rápida de enlaces
│   ├── package.json
│   └── Dockerfile            # Construcción multi-etapa (Front + Back)
├── frontend/
│   ├── src/
│   │   ├── components/       # Login, Acortador de URL y Gestor de Archivos
│   │   ├── App.jsx           # Orquestador del estado y navegación
│   │   ├── main.jsx          # Punto de partida de React
│   │   └── index.css         # Estilos visuales con animaciones y modo claro/oscuro
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── .env.example
├── .env
└── README.md
```

---

## Instrucciones de Inicio Rápido (Docker Compose)

### 1. Preparar las Variables de Entorno

Copia el archivo `.env.example` como `.env`:

```bash
cp .env.example .env
```

Abre el archivo `.env` y personaliza los valores si lo deseas:
- El usuario inicial por defecto se creará con las variables `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
- Cambia la variable `JWT_SECRET` por una cadena de caracteres aleatoria.
- Configura `CLOUDFLARE_TUNNEL_TOKEN` si planeas exponerlo a internet.

### 2. Iniciar la Aplicación

Ejecuta el siguiente comando en la raíz del proyecto:

```bash
docker compose up --build -d
```

Este comando:
1. Compilará y empaquetará el frontend de React.
2. Levantará el servidor backend de Express en el puerto `3000`.
3. Levantará el servidor de MinIO en los puertos `9000` (API de almacenamiento) y `9001` (Consola de control web).
4. Inicializará y configurará el Bucket en MinIO automáticamente en el primer arranque.
5. Creará y migrará la base de datos local SQLite (`database.sqlite`) para dar de alta las tablas e insertar el usuario semilla de administración.

### 3. Acceder a los Servicios

- **Aplicación Web**: [http://localhost:3000](http://localhost:3000)
- **Consola de MinIO**: [http://localhost:9001](http://localhost:9001) (Usa las credenciales `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` de tu `.env` para iniciar sesión y explorar el almacenamiento directamente).

---

## Publicación de la imagen en Docker Hub

El workflow de GitHub Actions compila la imagen usando `backend/Dockerfile` y publica
`<DOCKER_USERNAME>/filesharer` en Docker Hub en cada push. Crea el repositorio `filesharer`
en Docker Hub bajo la cuenta indicada y, en **Settings > Secrets and variables > Actions**,
configura estos secretos del repositorio:

- `DOCKER_USERNAME`: nombre de usuario de Docker Hub.
- `DOCKER_PASSWORD`: un access token de Docker Hub con permiso de escritura.

Se publican etiquetas con el nombre de la rama y el commit (`sha-<commit>`); la etiqueta
`latest` se publica únicamente para la rama predeterminada del repositorio. Por ejemplo,
para descargar la imagen de producción:

```bash
docker pull <DOCKER_USERNAME>/filesharer:latest
```

---

## Exposición a Internet mediante Cloudflare Tunnel

Si deseas que la aplicación sea accesible públicamente desde internet con HTTPS gratuito sin abrir puertos en tu router:

1. Ve a tu panel de [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).
2. Dirígete a **Networks** > **Tunnels** y crea un nuevo túnel de tipo **Cloudflared**.
3. Elige tu sistema operativo/entorno (Docker) y copia el **Token del túnel** provisto.
4. Abre tu archivo `.env` en la raíz del proyecto y pégalo en la variable:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=tu_token_de_cloudflare_aqui
   ```
5. En Cloudflare, asocia dos subdominios:
   *   `filesharer.tudominio.com` apuntando internamente a `http://web:3000`.
   *   `s3-filesharer.tudominio.com` apuntando internamente a `http://minio:9000` (API).
6. Cambia la variable `MINIO_EXTERNAL_ENDPOINT` en tu archivo `.env` al subdominio público asignado al puerto `9000` (`https://s3-filesharer.tudominio.com`). Esto evitará el error `SignatureDoesNotMatch` asegurando que la firma S3 se calcule con el mismo dominio con el que el navegador realiza la carga directa.
7. Reinicia los servicios de Docker:
   ```bash
   docker compose up -d
   ```

---

## Detalles Técnicos

### 1. Modelo de Datos (SQLite)
La base de datos SQLite se crea en la ruta definida en `.env`. Su esquema está optimizado para consultas rápidas de metadatos:
- **`users`**: Administra los usuarios registrados para el control de acceso.
- **`folders`**: Almacena las carpetas virtuales para agrupar urls y archivos (`type`: `'url'` o `'file'`).
- **`urls`**: Almacena el enlace descriptivo, su url original, el código corto aleatorio, el contador de clics, la fecha, y su relación con carpetas (`folder_id`) y etiquetas (`tags` en formato de cadena JSON).
- **`file_metadata`**: Guarda la relación de los archivos físicos subidos a MinIO (identificados por su nombre de clave único) con las carpetas virtuales de SQLite y sus etiquetas para permitir búsquedas cruzadas y filtrados rápidos en el frontend.

### 2. Integración de MinIO (Almacenamiento por Presigned URLs)
Para optimizar el uso de recursos del backend, el flujo de subida de archivos no consume ancho de banda del servidor de Node.js:
1. El frontend solicita al backend una URL pre-firmada enviando el tipo de archivo y tamaño.
2. El backend utiliza `minioSignClient` (configurado con el endpoint externo) para generar una URL segura de tipo `PUT` válida por 10 minutos.
3. El frontend sube el archivo **directamente** a MinIO realizando una petición HTTP `PUT` al endpoint retornado, monitoreando el progreso mediante XMLHttpRequest.
4. El backend registra paralelamente los metadatos de organización en SQLite.
5. Las descargas se gestionan mediante una ruta intermedia en el backend que redirige al navegador de forma segura con un estado `302` hacia una URL temporal de tipo `GET` firmada con 5 minutos de validez.

---

## Tecnologías Utilizadas

- **Backend**: Node.js, Express, SQLite (mediante el driver `sqlite3`), MinIO Javascript SDK (compatible con AWS S3 API).
- **Frontend**: React (Vite), CSS Puro (Vanilla CSS, variables y transiciones de temas CSS), Lucide React (Iconografía premium).
- **Contenedores**: Docker, Docker Compose, Cloudflared.
