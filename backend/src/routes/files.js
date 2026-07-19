const express = require('express');
const router = express.Router();
const {
  listFiles,
  getPresignedUpload,
  getPresignedDownload,
  downloadFileRedirect,
  deleteFile,
  updateFileMetadata
} = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, listFiles);
router.post('/presigned-upload', authMiddleware, getPresignedUpload);
router.get('/presigned-download/:filename', authMiddleware, getPresignedDownload);
router.get('/download/:filename', authMiddleware, downloadFileRedirect);
router.put('/metadata/:filename', authMiddleware, updateFileMetadata);
router.delete('/:filename', authMiddleware, deleteFile);

module.exports = router;
