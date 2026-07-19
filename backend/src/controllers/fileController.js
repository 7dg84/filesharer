const { minioClient, minioSignClient, bucketName } = require('../config/minio');
const { getDb } = require('../config/db');

// Helper para convertir la URL interna generada por MinIO en la URL externa accesible por el navegador
function replaceMinioHost(url) {
  const externalEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT;
  if (!externalEndpoint) return url;

  try {
    const parsedUrl = new URL(url);
    const parsedExternal = new URL(externalEndpoint);
    
    parsedUrl.protocol = parsedExternal.protocol;
    parsedUrl.host = parsedExternal.host;
    
    return parsedUrl.toString();
  } catch (error) {
    console.error('Error al mapear endpoint de MinIO:', error);
    return url;
  }
}

async function listFiles(req, res) {
  try {
    const db = await getDb();
    
    // Obtener metadatos de archivos y sus carpetas
    const metadataList = await db.all(`
      SELECT file_metadata.*, folders.name AS folder_name 
      FROM file_metadata 
      LEFT JOIN folders ON file_metadata.folder_id = folders.id
    `);
    
    const metadataMap = {};
    metadataList.forEach(meta => {
      metadataMap[meta.filename] = meta;
    });

    const objects = [];
    const stream = minioClient.listObjectsV2(bucketName, '', true);

    stream.on('data', (obj) => {
      const meta = metadataMap[obj.name] || {};
      let parsedTags = [];
      try {
        parsedTags = meta.tags ? JSON.parse(meta.tags) : [];
      } catch (e) {
        parsedTags = [];
      }

      objects.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified,
        etag: obj.etag,
        folder_id: meta.folder_id || null,
        folder_name: meta.folder_name || null,
        tags: parsedTags
      });
    });

    stream.on('end', () => {
      // Ordenar por fecha de modificación descendente
      objects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      return res.json(objects);
    });

    stream.on('error', (err) => {
      console.error('Error en listObjects de MinIO:', err);
      return res.status(500).json({ error: 'Error al listar los archivos de MinIO.' });
    });
  } catch (error) {
    console.error('Error al listar archivos:', error);
    return res.status(500).json({ error: 'Error interno al listar archivos.' });
  }
}

async function getPresignedUpload(req, res) {
  const { filename, contentType, folderId, tags } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'El nombre del archivo es obligatorio.' });
  }

  // Sanitizar el nombre del archivo para evitar inyecciones de ruta
  const cleanName = pathClean(filename);
  const uniqueFilename = `${Date.now()}-${cleanName}`;

  try {
    // Registrar el metadato en la base de datos antes de subir
    const db = await getDb();
    await db.run(
      'INSERT OR REPLACE INTO file_metadata (filename, folder_id, tags) VALUES (?, ?, ?)',
      [uniqueFilename, folderId || null, JSON.stringify(tags || [])]
    );

    // Generar URL pre-firmada para subir con PUT
    // Expira en 10 minutos (600 segundos)
    const url = await minioSignClient.presignedPutObject(bucketName, uniqueFilename, 600);
    const externalUrl = replaceMinioHost(url);

    return res.json({
      url: externalUrl,
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('Error generando URL pre-firmada de subida:', error);
    return res.status(500).json({ error: 'Error al generar la firma para subir archivo.' });
  }
}

async function getPresignedDownload(req, res) {
  const { filename } = req.params;

  try {
    // Generar URL pre-firmada de descarga (GET)
    // Expira en 5 minutos (300 segundos)
    const url = await minioSignClient.presignedGetObject(bucketName, filename, 300);
    const externalUrl = replaceMinioHost(url);

    return res.json({ url: externalUrl });
  } catch (error) {
    console.error('Error generando URL pre-firmada de descarga:', error);
    return res.status(500).json({ error: 'Error al generar enlace de descarga.' });
  }
}

async function downloadFileRedirect(req, res) {
  const { filename } = req.params;

  try {
    // Generar la URL y redirigir
    const url = await minioSignClient.presignedGetObject(bucketName, filename, 300);
    const externalUrl = replaceMinioHost(url);
    return res.redirect(externalUrl);
  } catch (error) {
    console.error('Error al redirigir descarga:', error);
    return res.status(500).send('Error al descargar el archivo.');
  }
}

async function deleteFile(req, res) {
  const { filename } = req.params;

  try {
    // Eliminar de MinIO
    await minioClient.removeObject(bucketName, filename);
    
    // Eliminar metadatos en SQLite
    const db = await getDb();
    await db.run('DELETE FROM file_metadata WHERE filename = ?', [filename]);
    
    return res.json({ message: 'Archivo eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar archivo de MinIO:', error);
    return res.status(500).json({ error: 'Error al eliminar el archivo.' });
  }
}

async function updateFileMetadata(req, res) {
  const { filename } = req.params;
  const { folderId, tags } = req.body;

  try {
    const db = await getDb();
    await db.run(
      'INSERT OR REPLACE INTO file_metadata (filename, folder_id, tags) VALUES (?, ?, ?)',
      [filename, folderId || null, JSON.stringify(tags || [])]
    );
    return res.json({ message: 'Metadatos del archivo actualizados.' });
  } catch (error) {
    console.error('Error al actualizar metadatos de archivo:', error);
    return res.status(500).json({ error: 'Error al actualizar metadatos.' });
  }
}

// Helper simple para sanitizar nombre del archivo
function pathClean(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplaza caracteres no alfanuméricos por guion bajo
    .replace(/_{2,}/g, '_'); // Evita guiones bajos consecutivos
}

module.exports = {
  listFiles,
  getPresignedUpload,
  getPresignedDownload,
  downloadFileRedirect,
  deleteFile,
  updateFileMetadata
};
