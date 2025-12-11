import express from 'express';
// Asegúrate de importar la función correcta del controlador
import { registrarEntradaReconocimiento } from '../controllers/entradaController.js';

const router = express.Router();

// Este es el endpoint que la app Android llamará
router.post('/entrada/registrar-reconocimiento', registrarEntradaReconocimiento);

export default router;