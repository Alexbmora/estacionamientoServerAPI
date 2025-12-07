import express from 'express';
import { upload } from '../middlewares/upload.js';
import { subirFoto, listarFotos, procesarFotoML, obtenerResultadoFoto } from '../controllers/fotoController.js';

const router = express.Router();

router.post('/subir-foto', upload.single('archivo'), subirFoto);
router.get('/fotos', listarFotos);
router.post('/procesar-foto', procesarFotoML);
router.get('/foto/:id/resultado', obtenerResultadoFoto);

export default router;