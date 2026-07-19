const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

let db;

async function getDb() {
  if (db) return db;

  const dbPath = process.env.SQLITE_DB_PATH || './data/database.sqlite';
  const dbDir = path.dirname(dbPath);

  // Asegurar que el directorio de la base de datos existe
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Inicializar tablas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'url' o 'file'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      original_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      clicks INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS file_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migraciones / Alteración de tablas existentes si es necesario
  const urlColumnsInfo = await db.all("PRAGMA table_info(urls)");
  const urlColumns = urlColumnsInfo.map(col => col.name);

  if (!urlColumns.includes('folder_id')) {
    await db.exec('ALTER TABLE urls ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL');
    console.log('[DB] Columna "folder_id" añadida a la tabla "urls"');
  }

  if (!urlColumns.includes('tags')) {
    await db.exec("ALTER TABLE urls ADD COLUMN tags TEXT DEFAULT '[]'");
    console.log('[DB] Columna "tags" añadida a la tabla "urls"');
  }


  // Sembrar usuario inicial
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'adminpassword123';
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [adminUser, hashedPassword]
    );
    console.log(`[DB] Base de datos inicializada. Usuario por defecto creado: "${adminUser}"`);
  }

  return db;
}

module.exports = { getDb };
