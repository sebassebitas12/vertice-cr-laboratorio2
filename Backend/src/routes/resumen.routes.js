const express = require('express');
const controller = require('../controllers/resumen.controller');

const router = express.Router();

router.get('/', controller.obtener);

module.exports = router;
