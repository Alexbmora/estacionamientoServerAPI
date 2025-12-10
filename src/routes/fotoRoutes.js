import express from 'express';
import { upload } from '../middlewares/upload.js';
import { subirFoto, listarFotos, descargarFotoData, notificarResultadoFoto } from '../controllers/fotoController.js';

const router = express.Router();

router.post('/subir-foto', upload.single('archivo'), subirFoto);
router.get('/fotos', listarFotos);

router.get('/foto/data/:filename', descargarFotoData);
router.post('/foto/resultado', notificarResultadoFoto);

export default router;