import db from '../config/db.js';

export const iniciarTurno = (req, res) => {
    const { telegramId, firstName, lastName } = req.body;
    if (!telegramId || !firstName) {
        return res.status(400).json({ error: 'Faltan datos del guardia.' });
    }

    const sql = 'CALL sp_iniciar_turno(?, ?, ?)';
    db.query(sql, [telegramId, firstName, lastName || ''], (err, result) => {
        if (err) {
            console.error('Error en BD al iniciar turno:', err);
            return res.status(500).json({ error: 'Error iniciando turno en BD' });
        }
        // El SP devuelve un array con el resultado, accedemos a la primera fila.
        const id_turno = result[0][0].id_turno;
        res.status(201).json({ mensaje: 'Turno iniciado', id_turno: id_turno });
    });
};

export const terminarTurno = (req, res) => {
    const { id_turno } = req.body;
    if (!id_turno) return res.status(400).json({ error: 'Falta id_turno' });

    const sql = 'CALL sp_cerrar_turno(?)';
    db.query(sql, [id_turno], (err) => {
        if (err) {
            console.error('Error en BD al terminar turno:', err);
            return res.status(500).json({ error: 'Error terminando turno' });
        }
        res.json({ mensaje: 'Turno terminado correctamente' });
    });
};

export const registrarInvitado = (req, res) => {
    const { nombre, edificio, id_turno } = req.body;
    if (!nombre || !edificio || !id_turno) {
        return res.status(400).json({ error: 'Faltan campos (nombre, edificio, id_turno)' });
    }

    const sql = 'CALL sp_registrar_invitado(?, ?, ?)';
    db.query(sql, [nombre, edificio, id_turno], (err, result) => {
        if (err) {
            console.error('Error en BD al registrar invitado:', err);
            return res.status(500).json({ error: 'Error registrando invitado' });
        }
        const id_invitado = result[0][0].id_invitado;
        res.status(201).json({ mensaje: 'Invitado registrado', id_invitado: id_invitado });
    });
};

export const obtenerReporte = (req, res) => {
    const { turno_id } = req.query;
    if (!turno_id) return res.status(400).json({ error: 'Falta turno_id' });

    const sql = 'SELECT tipo, COUNT(*) as total FROM entradas WHERE id_turno = ? GROUP BY tipo';
    db.query(sql, [turno_id], (err, rows) => {
        if (err) {
            console.error('Error en BD al generar reporte:', err);
            return res.status(500).json({ error: 'Error generando reporte' });
        }
        res.json({ turno_id, resumen: rows });
    });
};

export const obtenerTurnoActivo = (req, res) => {
    // El ID del guardia se pasa como un query parameter, ej: /turno/activo?telegramId=123
    const { telegramId } = req.query;
    if (!telegramId) {
        return res.status(400).json({ error: 'Falta el parámetro telegramId.' });
    }

    const sql = 'CALL sp_obtener_turno_activo(?)';
    db.query(sql, [telegramId], (err, result) => {
        if (err) {
            console.error('Error en BD al obtener turno activo:', err);
            return res.status(500).json({ error: 'Error consultando turno activo.' });
        }

        // El SP devuelve un array de filas. Si no hay turno activo, estará vacío.
        if (result[0] && result[0].length > 0) {
            // Devolvemos el primer (y único) resultado.
            res.json({ turnoActivo: true, turno: result[0][0] });
        } else {
            // No hay turno activo.
            res.json({ turnoActivo: false, turno: null });
        }
    });
};