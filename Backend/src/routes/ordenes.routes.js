const express = require('express');
const controller = require('../controllers/ordenes.controller');

const router = express.Router();

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.patch('/:id/estado', controller.cambiarEstado);

module.exports = router;
