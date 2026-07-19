const express = require('express');
const router = express.Router();
const { createUrl, listUrls, deleteUrl } = require('../controllers/urlController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createUrl);
router.get('/', authMiddleware, listUrls);
router.delete('/:id', authMiddleware, deleteUrl);

module.exports = router;
