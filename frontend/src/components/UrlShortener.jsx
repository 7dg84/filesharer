import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, Check, Trash2, Globe, FileText, AlertCircle, PlusCircle, ExternalLink, Plus, FolderOpen, Tag, X } from 'lucide-react';

export default function UrlShortener({ token }) {
  const [urls, setUrls] = useState([]);
  const [folders, setFolders] = useState([]);
  const [name, setName] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Estados de control del modal de carpeta
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Estados de filtros
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFolderId, setFilterFolderId] = useState('all');
  const [filterTag, setFilterTag] = useState('');

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchUrls = async () => {
    try {
      const response = await fetch('/api/urls', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUrls(data);
      } else {
        setError(data.error || 'Error al obtener los enlaces');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setFetching(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders?type=url', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('Error al cargar carpetas:', err);
    }
  };

  useEffect(() => {
    fetchUrls();
    fetchFolders();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          originalUrl,
          folderId: selectedFolderId || null,
          tags 
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al acortar la URL');
      }

      setUrls([data, ...urls]);
      setName('');
      setOriginalUrl('');
      setSelectedFolderId('');
      setTags([]);
      setTagInput('');
      setSuccess('¡Enlace acortado con éxito!');
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: 'url'
        })
      });
      const data = await response.json();

      if (response.ok) {
        setFolders([...folders, data]);
        setSelectedFolderId(data.id);
        setNewFolderName('');
        setShowFolderModal(false);
      } else {
        alert(data.error || 'Error al crear carpeta');
      }
    } catch (err) {
      alert('Error al conectar con el servidor para crear la carpeta');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este enlace?')) return;
    setError('');

    try {
      const response = await fetch(`/api/urls/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar enlace');
      }

      setUrls(urls.filter(url => url.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Manejo de etiquetas
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagInput.trim().toLowerCase().replace(/,/g, '');
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const copyToClipboard = (shortCode, id) => {
    const fullUrl = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const truncateUrl = (url, max = 30) => {
    if (url.length <= max) return url;
    return url.substring(0, max) + '...';
  };

  // Helper para colorear dinámicamente las etiquetas basadas en su nombre
  const getTagStyle = (tagName) => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return {
      backgroundColor: `hsla(${h}, 70%, 50%, 0.12)`,
      color: `hsl(${h}, 75%, 60%)`,
      borderColor: `hsla(${h}, 70%, 50%, 0.25)`
    };
  };

  // Filtrado de URLs
  const filteredUrls = urls.filter(url => {
    const matchSearch = filterSearch.trim() === '' || 
      url.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      url.original_url.toLowerCase().includes(filterSearch.toLowerCase()) ||
      url.short_code.toLowerCase().includes(filterSearch.toLowerCase());

    let matchFolder = true;
    if (filterFolderId === 'none') {
      matchFolder = !url.folder_id;
    } else if (filterFolderId !== 'all') {
      matchFolder = String(url.folder_id) === String(filterFolderId);
    }

    let matchTag = true;
    if (filterTag.trim() !== '') {
      let urlTags = [];
      try {
        urlTags = typeof url.tags === 'string' ? JSON.parse(url.tags) : (url.tags || []);
      } catch (e) {
        urlTags = [];
      }
      matchTag = urlTags.some(t => t.toLowerCase().includes(filterTag.toLowerCase()));
    }

    return matchSearch && matchFolder && matchTag;
  });

  return (
    <div className="module-container">
      {/* Formulario a la izquierda */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <LinkIcon size={20} />
          Acortar Enlace
        </h3>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <Check size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url-name">Nombre descriptivo</label>
            <div className="input-wrapper">
              <FileText size={18} />
              <input
                id="url-name"
                type="text"
                className="form-input"
                placeholder="Ej. Mi Blog, Dashboard, etc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="original-url">URL Original</label>
            <div className="input-wrapper">
              <Globe size={18} />
              <input
                id="original-url"
                type="url"
                className="form-input"
                placeholder="https://ejemplo.com/pagina-larga"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Carpeta */}
          <div className="form-group">
            <label htmlFor="url-folder">Carpeta</label>
            <div className="selector-with-action">
              <div className="input-wrapper" style={{ flexGrow: 1 }}>
                <FolderOpen size={18} style={{ zIndex: 2 }} />
                <select
                  id="url-folder"
                  className="form-input"
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '44px', appearance: 'none', background: 'rgba(0,0,0,0.2) url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>") no-repeat right 12px center' }}
                >
                  <option value="">Sin carpeta</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="button" 
                className="btn-inline-action" 
                onClick={() => setShowFolderModal(true)}
                title="Crear nueva carpeta"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="form-group">
            <label htmlFor="url-tags">Etiquetas</label>
            <div className="tag-input-container">
              {tags.map((tag, idx) => (
                <span key={idx} className="tag-input-chip">
                  {tag}
                  <button type="button" onClick={() => removeTag(idx)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                id="url-tags"
                type="text"
                className="tag-raw-input"
                placeholder={tags.length === 0 ? "Escribe y presiona Enter o coma..." : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <PlusCircle size={20} />
                <span>Acortar URL</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tabla y Filtros a la derecha */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Barra de Filtros */}
        <div className="filter-bar">
          <div className="filter-item search">
            <label>Buscar</label>
            <input 
              type="text" 
              className="filter-input" 
              placeholder="Buscar por nombre, URL o código..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label>Filtrar por Carpeta</label>
            <select 
              className="filter-select"
              value={filterFolderId}
              onChange={(e) => setFilterFolderId(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="none">Sin Carpeta</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Filtrar por Etiqueta</label>
            <input 
              type="text" 
              className="filter-input" 
              placeholder="Ej. urgente..."
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="dashboard-card table-card">
          <div className="table-header">
            <h3>Enlaces Creados</h3>
            <span className="file-size-badge">{filteredUrls.length} de {urls.length} enlaces</span>
          </div>

          <div className="table-wrapper">
            {fetching ? (
              <div className="empty-state">
                <span className="spinner"></span>
                <p>Cargando enlaces...</p>
              </div>
            ) : filteredUrls.length === 0 ? (
              <div className="empty-state">
                <LinkIcon size={48} />
                <p>No se encontraron enlaces.</p>
                <span>Prueba a cambiar los filtros o crea uno nuevo a la izquierda.</span>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Carpeta</th>
                    <th>Original</th>
                    <th>Enlace Corto</th>
                    <th>Etiquetas</th>
                    <th>Clics</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUrls.map((url) => {
                    const shortUrl = `${window.location.origin}/s/${url.short_code}`;
                    let urlTags = [];
                    try {
                      urlTags = typeof url.tags === 'string' ? JSON.parse(url.tags) : (url.tags || []);
                    } catch (e) {
                      urlTags = [];
                    }

                    return (
                      <tr key={url.id}>
                        <td style={{ fontWeight: '600' }}>{url.name}</td>
                        <td>
                          {url.folder_name ? (
                            <span className="folder-badge">
                              <FolderOpen size={12} />
                              {url.folder_name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </td>
                        <td title={url.original_url}>
                          <a 
                            href={url.original_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            {truncateUrl(url.original_url)}
                            <ExternalLink size={12} />
                          </a>
                        </td>
                        <td>
                          <div className="short-link-cell">
                            <a 
                              href={shortUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="short-link-badge"
                            >
                              /{url.short_code}
                            </a>
                          </div>
                        </td>
                        <td>
                          <div className="tags-container">
                            {urlTags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="tag-badge" 
                                style={getTagStyle(tag)}
                              >
                                {tag}
                              </span>
                            ))}
                            {urlTags.length === 0 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="file-size-badge" style={{ fontWeight: '600' }}>
                            {url.clicks}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-icon"
                              onClick={() => copyToClipboard(url.short_code, url.id)}
                              title="Copiar enlace corto"
                            >
                              {copiedId === url.id ? <Check size={16} style={{ color: 'var(--success-color)' }} /> : <Copy size={16} />}
                            </button>
                            <button 
                              className="btn-icon delete"
                              onClick={() => handleDelete(url.id)}
                              title="Eliminar enlace"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal para Crear Carpeta */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Crear Nueva Carpeta</h3>
              <button className="modal-close-btn" onClick={() => setShowFolderModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label htmlFor="new-folder-name">Nombre de la carpeta</label>
                <div className="input-wrapper">
                  <FolderOpen size={18} />
                  <input
                    id="new-folder-name"
                    type="text"
                    className="form-input"
                    placeholder="Ej. Trabajo, Redes, etc."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowFolderModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  Crear Carpeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
