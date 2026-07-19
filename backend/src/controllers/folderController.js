const { getDb } = require('../config/db');

async function listFolders(req, res) {
  const { type } = req.query;

  if (!type || (type !== 'url' && type !== 'file')) {
    return res.status(400).json({ error: 'El parámetro "type" debe ser "url" o "file".' });
  }

  try {
    const db = await getDb();
    const folders = await db.all('SELECT * FROM folders WHERE type = ? ORDER BY name ASC', [type]);
    return res.json(folders);
  } catch (error) {
    console.error('Error al listar carpetas:', error);
    return res.status(500).json({ error: 'Error al obtener la lista de carpetas.' });
  }
}

async function createFolder(req, res) {
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'El nombre y el tipo de carpeta son obligatorios.' });
  }

  if (type !== 'url' && type !== 'file') {
    return res.status(400).json({ error: 'El tipo debe ser "url" o "file".' });
  }

  try {
    const db = await getDb();
    
    // Verificar duplicado en el mismo tipo
    const existing = await db.get('SELECT id FROM folders WHERE name = ? AND type = ?', [name, type]);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una carpeta con ese nombre para este módulo.' });
    }

    const result = await db.run(
      'INSERT INTO folders (name, type) VALUES (?, ?)',
      [name, type]
    );

    const newFolder = await db.get('SELECT * FROM folders WHERE id = ?', [result.lastID]);
    return res.status(201).json(newFolder);
  } catch (error) {
    console.error('Error al crear carpeta:', error);
    return res.status(500).json({ error: 'Error al registrar la carpeta.' });
  }
}

async function deleteFolder(req, res) {
  const { id } = req.params;

  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM folders WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Carpeta no encontrada.' });
    }
    return res.json({ message: 'Carpeta eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar carpeta:', error);
    return res.status(500).json({ error: 'Error al eliminar la carpeta.' });
  }
}

module.exports = { listFolders, createFolder, deleteFolder };
