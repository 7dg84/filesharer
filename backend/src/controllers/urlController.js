const { getDb } = require('../config/db');

function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createUrl(req, res) {
  const { name, originalUrl, folderId, tags } = req.body;

  if (!name || !originalUrl) {
    return res.status(400).json({ error: 'Nombre y URL original son obligatorios.' });
  }

  // Validar formato de URL básica
  try {
    new URL(originalUrl);
  } catch (err) {
    return res.status(400).json({ error: 'URL original inválida. Asegúrate de incluir http:// o https://' });
  }

  try {
    const db = await getDb();
    let shortCode;
    let isUnique = false;

    // Bucle para evitar colisiones
    while (!isUnique) {
      shortCode = generateShortCode();
      const existing = await db.get('SELECT id FROM urls WHERE short_code = ?', [shortCode]);
      if (!existing) {
        isUnique = true;
      }
    }

    await db.run(
      'INSERT INTO urls (name, original_url, short_code, folder_id, tags) VALUES (?, ?, ?, ?, ?)',
      [name, originalUrl, shortCode, folderId || null, JSON.stringify(tags || [])]
    );

    const newUrl = await db.get(
      'SELECT urls.*, folders.name AS folder_name FROM urls LEFT JOIN folders ON urls.folder_id = folders.id WHERE urls.short_code = ?',
      [shortCode]
    );
    return res.status(201).json(newUrl);
  } catch (error) {
    console.error('Error al crear URL corta:', error);
    return res.status(500).json({ error: 'Error al registrar la URL en el servidor.' });
  }
}

async function listUrls(req, res) {
  try {
    const db = await getDb();
    const urls = await db.all(`
      SELECT urls.*, folders.name AS folder_name 
      FROM urls 
      LEFT JOIN folders ON urls.folder_id = folders.id 
      ORDER BY urls.created_at DESC
    `);
    return res.json(urls);
  } catch (error) {
    console.error('Error al listar URLs:', error);
    return res.status(500).json({ error: 'Error al obtener la lista de URLs.' });
  }
}

async function deleteUrl(req, res) {
  const { id } = req.params;

  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM urls WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enlace no encontrado.' });
    }
    return res.json({ message: 'Enlace eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar URL:', error);
    return res.status(500).json({ error: 'Error al eliminar el enlace.' });
  }
}

module.exports = { createUrl, listUrls, deleteUrl };
