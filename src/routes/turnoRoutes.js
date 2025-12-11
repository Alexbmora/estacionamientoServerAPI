import express from 'express';
import {
    iniciarTurno,
    terminarTurno,
    registrarInvitado,
    obtenerReporte,
    obtenerTurnoActivo // Asegúrate de importar la nueva función
} from '../controllers/turnoController.js';

const router = express.Router();
// Rutas para la gestión de turnos
router.post('/turno/iniciar', iniciarTurno);
router.post('/turno/terminar', terminarTurno);
router.get('/turno/activo', obtenerTurnoActivo); // Ruta para verificar el estado del turno
router.get('/turno/reporte', obtenerReporte);

// Ruta para la gestión de invitados
router.post('/invitado/registrar', registrarInvitado);

export default router;