const express = require('express');
const router = express.Router();
const { listFolders, createFolder, deleteFolder } = require('../controllers/folderController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, listFolders);
router.post('/', authMiddleware, createFolder);
router.delete('/:id', authMiddleware, deleteFolder);

module.exports = router;
