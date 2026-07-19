const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadminpassword123'
});

// Cliente secundario usado exclusivamente para firmar URLs temporales (GET/PUT)
// Esto evita el error SignatureDoesNotMatch al asegurar que el header Host firmado coincida con el Host del navegador
const externalEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT || 'http://localhost:9000';
let signEndPoint = 'localhost';
let signPort = 9000;
let signUseSSL = false;

try {
  const parsed = new URL(externalEndpoint);
  signEndPoint = parsed.hostname;
  signPort = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
  signUseSSL = parsed.protocol === 'https:';
} catch (e) {
  console.error('[MinIO] Error al parsear MINIO_EXTERNAL_ENDPOINT para firmas:', e.message);
}

const minioSignClient = new Minio.Client({
  endPoint: signEndPoint,
  port: signPort,
  useSSL: signUseSSL,
  accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadminpassword123'
});


const bucketName = process.env.MINIO_BUCKET || 'filesharer-bucket';

async function initMinio() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`[MinIO] Bucket "${bucketName}" creado exitosamente.`);
    } else {
      console.log(`[MinIO] Bucket "${bucketName}" ya existe.`);
    }
  } catch (error) {
    console.error('[MinIO] Error conectando o inicializando el bucket:', error.message);
  }
}

module.exports = { minioClient, minioSignClient, bucketName, initMinio };
