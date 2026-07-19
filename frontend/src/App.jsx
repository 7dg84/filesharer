import React, { useState, useEffect } from 'react';
import { Link, HardDrive, Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import Login from './components/Login';
import UrlShortener from './components/UrlShortener';
import FileShare from './components/FileShare';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('urls'); // 'urls' o 'files'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Inicializar y cambiar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Verificar la sesión en el arranque
  useEffect(() => {
    const checkSession = async () => {
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Si el token falló, limpiamos
          handleLogout();
        }
      } catch (err) {
        console.error('Error verificando sesión:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, [token]);

  const handleLoginSuccess = (newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedUser);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (checkingAuth) {
    return (
      <div className="auth-container">
        <span className="spinner" style={{ width: '48px', height: '48px' }}></span>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-wrapper">
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      <div className="dashboard-container">
        {/* Barra de navegación superior */}
        <header className="dashboard-header">
          <div className="logo-section">
            <div className="logo-icon">🔗</div>
            <div>
              <h2>Filesharer & Shortener</h2>
              <p>Acortador y Compartidor Seguro</p>
            </div>
          </div>

          <div className="header-actions">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--success-color)' }} />
              {user.username}
            </span>

            <button onClick={toggleTheme} className="theme-toggle-btn" title="Cambiar tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button onClick={handleLogout} className="logout-btn" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Pestañas de navegación */}
        <nav className="tabs-navigation">
          <button 
            className={`tab-btn ${activeTab === 'urls' ? 'active' : ''}`}
            onClick={() => setActiveTab('urls')}
          >
            <Link size={18} />
            <span>Acortador de URLs</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <HardDrive size={18} />
            <span>Compartir Archivos</span>
          </button>
        </nav>

        {/* Contenido principal según pestaña activa */}
        <main>
          {activeTab === 'urls' ? (
            <UrlShortener token={token} />
          ) : (
            <FileShare token={token} />
          )}
        </main>
      </div>
    </div>
  );
}
