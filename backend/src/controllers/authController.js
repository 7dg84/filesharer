const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';
    const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Local/Docker local no usa ssl
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
    });

    return res.json({ message: 'Login exitoso', token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function logout(req, res) {
  res.clearCookie('token');
  return res.json({ message: 'Sesión cerrada exitosamente.' });
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, logout, me };
