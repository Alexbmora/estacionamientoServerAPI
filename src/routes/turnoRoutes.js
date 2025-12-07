import express from 'express';
import { iniciarTurno, terminarTurno, registrarInvitado, obtenerReporte } from '../controllers/turnoController.js';

const router = express.Router();

router.post('/turno/iniciar', iniciarTurno);
router.post('/turno/terminar', terminarTurno);
router.post('/invitado', registrarInvitado);
router.get('/reporte', obtenerReporte);

export default router;