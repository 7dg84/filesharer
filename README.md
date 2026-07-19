# Filesharer & Shortener

Una aplicación web moderna, segura y de diseño premium para acortar enlaces y compartir archivos, completamente contenedorizada en Docker y lista para ser expuesta al público con un túnel de Cloudflare.

## Características

- 🔗 **Acortador de URLs**: Crea enlaces cortos con un nombre descriptivo y monitorea el número de clics en tiempo real.
- 📁 **Gestor de Archivos (MinIO)**: Sube y descarga archivos de manera segura directamente a MinIO a través de firmas temporales de AWS S3 (Presigned URLs).
- 🌓 **Modo Oscuro / Claro**: Interfaz de diseño premium con soporte de tema claro/oscuro que respeta tus preferencias y se adapta con transiciones suaves.
- 🔒 **Acceso Protegido**: Acceso con usuario y contraseña protegido por JWT (JSON Web Tokens) guardados en cookies HttpOnly.
- 🐋 **Dockerizado**: Configurado en Docker Compose listo para ejecutarse en cualquier entorno con una base de datos SQLite integrada.
- ☁️ **Cloudflare Tunnel**: Servicio integrado para exponer tu aplicación local de forma segura al internet sin necesidad de abrir puertos (CGNAT bypass).

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
│   │   ├── config/           # Configuración de base de datos SQLite y MinIO
│   │   ├── controllers/      # Controladores de auth, urls y archivos
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
- Deja `CLOUDFLARE_TUNNEL_TOKEN` vacío en desarrollo local.

### 2. Iniciar la Aplicación

Ejecuta el siguiente comando en la raíz del proyecto:

```bash
docker compose up --build -d
```

Este comando:
1. Construirá y empaquetará el frontend de React.
2. Levantará el servidor backend de Express en el puerto `3000`.
3. Levantará el servidor de MinIO en los puertos `9000` (API de almacenamiento) y `9001` (Consola de control web).
4. Inicializará y configurará el Bucket en MinIO automáticamente en el primer arranque.
5. Sembrará las tablas y el usuario administrador en la base de datos local SQLite.

### 3. Acceder a los Servicios

- **Aplicación Web**: [http://localhost:3000](http://localhost:3000)
- **Consola de MinIO**: [http://localhost:9001](http://localhost:9001) (Usa las credenciales `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` de tu `.env` para iniciar sesión y explorar el almacenamiento directamente).

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
5. En Cloudflare, asocia un subdominio de tu propiedad (ej: `compartidor.midominio.com`) y apúntalo a la URL interna del contenedor: `http://web:3000`.
6. Si expones MinIO externamente para las descargas/subidas, cambia la variable `MINIO_EXTERNAL_ENDPOINT` en tu archivo `.env` al subdominio público asignado en el túnel para que los clientes del navegador puedan conectarse desde cualquier parte de internet.
7. Reinicia los servicios de Docker:
   ```bash
   docker compose restart cloudflared
   ```
8. ¡Listo! Cloudflare se encargará de establecer el túnel cifrado y tu aplicación estará disponible globalmente de forma segura.

---

## Tecnologías Utilizadas

- **Backend**: Node.js, Express, SQLite (mediante el driver `sqlite3`), MinIO Javascript SDK (compatible con AWS S3 API).
- **Frontend**: React (Vite), CSS Puro (Vanila CSS, Variables CSS), Lucide React (Iconografía premium).
- **Contenedores**: Docker, Docker Compose, Cloudflared.
