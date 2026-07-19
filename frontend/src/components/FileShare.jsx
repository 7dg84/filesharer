import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FolderOpen, File, Trash2, Download, AlertCircle, Check, HardDrive, Plus, Tag, X } from 'lucide-react';

export default function FileShare({ token }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
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

  // Estados de carga de archivos
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setFiles(data);
      } else {
        setError(data.error || 'Error al listar los archivos');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setFetching(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders?type=file', {
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
    fetchFiles();
    fetchFolders();
  }, [token]);

  const handleUpload = (file) => {
    if (!file) return;

    setError('');
    setSuccess('');
    setUploading(true);
    setUploadProgress(0);

    // 1. Obtener la URL pre-firmada de subida (PUT) enviando también carpeta y etiquetas
    fetch('/api/files/presigned-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        folderId: selectedFolderId || null,
        tags
      })
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Fallo de firma') });
        }
        return res.json();
      })
      .then(({ url, filename }) => {
        // 2. Subir directamente el archivo a S3 (MinIO) usando XHR
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);
          xhr.setRequestHeader('Content-Type', file.type);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percentComplete);
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error('Fallo al subir archivo a MinIO'));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Error de red durante la subida'));
          };

          xhr.send(file);
        });
      })
      .then(() => {
        setSuccess('¡Archivo subido exitosamente!');
        setSelectedFolderId('');
        setTags([]);
        setTagInput('');
        fetchFiles();
        setTimeout(() => setSuccess(''), 4000);
      })
      .catch((err) => {
        setError(err.message || 'Error al subir el archivo');
      })
      .finally(() => {
        setUploading(false);
        setUploadProgress(0);
      });
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
          type: 'file'
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
      alert('Error de conexión al crear carpeta');
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm('¿Estás seguro de eliminar este archivo permanentemente?')) return;
    setError('');

    try {
      const response = await fetch(`/api/files/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar archivo');
      }

      setFiles(files.filter(f => f.name !== filename));
      setSuccess('Archivo eliminado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
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

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const getDisplayName = (s3Name) => {
    const dashIndex = s3Name.indexOf('-');
    if (dashIndex === -1) return s3Name;
    return s3Name.substring(dashIndex + 1);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  // Filtrado de archivos
  const filteredFiles = files.filter(file => {
    const displayName = getDisplayName(file.name);
    const matchSearch = filterSearch.trim() === '' || 
      displayName.toLowerCase().includes(filterSearch.toLowerCase());

    let matchFolder = true;
    if (filterFolderId === 'none') {
      matchFolder = !file.folder_id;
    } else if (filterFolderId !== 'all') {
      matchFolder = String(file.folder_id) === String(filterFolderId);
    }

    let matchTag = true;
    if (filterTag.trim() !== '') {
      matchTag = file.tags && file.tags.some(t => t.toLowerCase().includes(filterTag.toLowerCase()));
    }

    return matchSearch && matchFolder && matchTag;
  });

  return (
    <div className="module-container">
      {/* Zona de Subida y Configuración de metadatos */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <UploadCloud size={20} />
          Subir Archivo
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

        {/* Parámetros de organización antes de subir */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          
          <div className="form-group">
            <label htmlFor="file-folder">Organizar en Carpeta</label>
            <div className="selector-with-action">
              <div className="input-wrapper" style={{ flexGrow: 1 }}>
                <FolderOpen size={18} style={{ zIndex: 2 }} />
                <select
                  id="file-folder"
                  className="form-input"
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  disabled={uploading}
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
                title="Crear nueva carpeta de archivos"
                disabled={uploading}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="file-tags">Asignar Etiquetas</label>
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
                id="file-tags"
                type="text"
                className="tag-raw-input"
                placeholder={tags.length === 0 ? "Escribe y presiona Enter..." : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={uploading}
              />
            </div>
          </div>

        </div>

        {/* Zona Drag & Drop */}
        <div 
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current.click()}
          style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
        >
          <UploadCloud size={48} />
          <div>
            <p>{uploading ? 'Subiendo archivo...' : 'Arrastra y suelta tu archivo aquí'}</p>
            <span>{!uploading && 'o haz clic para explorar'}</span>
          </div>
          <input 
            type="file"
            className="file-input"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div style={{ marginTop: '20px' }}>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <div className="progress-text">
              <span>Subiendo a almacenamiento...</span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabla y Filtros a la derecha */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Barra de Filtros */}
        <div className="filter-bar">
          <div className="filter-item search">
            <label>Buscar Archivo</label>
            <input 
              type="text" 
              className="filter-input" 
              placeholder="Buscar por nombre de archivo..."
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
              placeholder="Ej. pdf..."
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de Archivos */}
        <div className="dashboard-card table-card">
          <div className="table-header">
            <h3>Archivos Almacenados (MinIO)</h3>
            <span className="file-size-badge">{filteredFiles.length} de {files.length} archivos</span>
          </div>

          <div className="table-wrapper">
            {fetching ? (
              <div className="empty-state">
                <span className="spinner"></span>
                <p>Cargando archivos...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="empty-state">
                <HardDrive size={48} />
                <p>No se encontraron archivos.</p>
                <span>Sube un archivo nuevo o ajusta los filtros de búsqueda.</span>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Carpeta</th>
                    <th>Tamaño</th>
                    <th>Etiquetas</th>
                    <th>Fecha de subida</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.name}>
                      <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <File size={16} style={{ color: 'var(--accent-color)' }} />
                        <span title={file.name}>{getDisplayName(file.name)}</span>
                      </td>
                      <td>
                        {file.folder_name ? (
                          <span className="folder-badge">
                            <FolderOpen size={12} />
                            {file.folder_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="file-size-badge">{formatBytes(file.size)}</span>
                      </td>
                      <td>
                        <div className="tags-container">
                          {file.tags && file.tags.map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="tag-badge" 
                              style={getTagStyle(tag)}
                            >
                              {tag}
                            </span>
                          ))}
                          {(!file.tags || file.tags.length === 0) && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(file.lastModified)}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <a 
                            href={`/api/files/download/${file.name}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn-icon"
                            title="Descargar archivo"
                          >
                            <Download size={16} />
                          </a>
                          <button 
                            className="btn-icon delete"
                            onClick={() => handleDelete(file.name)}
                            title="Eliminar permanentemente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <h3>Crear Carpeta para Archivos</h3>
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
                    placeholder="Ej. Facturas, Fotos, Trabajo..."
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
