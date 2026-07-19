require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { getDb } = require('./config/db');
const { initMinio } = require('./config/minio');

// Importar rutas
const authRoutes = require('./routes/auth');
const urlRoutes = require('./routes/urls');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({
  origin: true, // Permitir cualquier origen en desarrollo
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Redireccionamiento rápido para el acortador de URLs: /s/:shortCode
app.get('/s/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  try {
    const db = await getDb();
    const urlRecord = await db.get('SELECT * FROM urls WHERE short_code = ?', [shortCode]);

    if (!urlRecord) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Enlace no encontrado</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #121214; color: #e1e1e6; text-align: center; padding-top: 100px; }
            h1 { color: #ff5555; }
            a { color: #8257e5; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>404 - Enlace no encontrado</h1>
          <p>El código de enlace corto "<strong>${shortCode}</strong>" no está registrado o ha sido eliminado.</p>
          <p><a href="/">Volver a la aplicación</a></p>
        </body>
        </html>
      `);
    }

    // Incrementar contador de clics
    await db.run('UPDATE urls SET clicks = clicks + 1 WHERE id = ?', [urlRecord.id]);

    // Redirigir al enlace original
    return res.redirect(urlRecord.original_url);
  } catch (error) {
    console.error('Error al redireccionar URL:', error);
    return res.status(500).send('Error interno del servidor al procesar la redirección.');
  }
});

// Registrar rutas API
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);

// Servir archivos estáticos del Frontend
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Ruta fallback para el router SPA de React
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/s/')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      // Si el frontend no está compilado aún, responde con un mensaje amigable
      res.status(200).send('Servidor Backend en funcionamiento. Frontend no compilado aún.');
    }
  });
});

// Inicializar servicios y arrancar servidor
async function startServer() {
  try {
    // 1. Inicializar SQLite
    await getDb();

    // 2. Inicializar MinIO
    await initMinio();

    // 3. Iniciar escucha
    app.listen(PORT, () => {
      console.log(`[Server] Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Fallo al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
