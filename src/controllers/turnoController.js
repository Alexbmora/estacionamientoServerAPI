import db from '../config/db.js';

export const iniciarTurno = (req, res) => {
  db.query('INSERT INTO turnos (iniciado_en) VALUES (NOW())', (err, result) => {
    if (err) return res.status(500).json({ error: 'Error iniciando turno' });
    res.json({ mensaje: 'Turno iniciado', id_turno: result.insertId });
  });
};

export const terminarTurno = (req, res) => {
  const { id_turno } = req.body;
  if (!id_turno) return res.status(400).json({ error: 'Falta id_turno' });

  db.query('UPDATE turnos SET terminado_en = NOW() WHERE id = ?', [id_turno], (err) => {
      if (err) return res.status(500).json({ error: 'Error terminando turno' });
      res.json({ mensaje: 'Turno terminado' });
    }
  );
};

export const registrarInvitado = (req, res) => {
  const { nombre, edificio, id_turno } = req.body;
  if (!nombre || !edificio) return res.status(400).json({ error: 'Faltan campos' });

  const sql = `INSERT INTO invitados (nombre, edificio, id_turno) VALUES (?, ?, ?)`;
  db.query(sql, [nombre, edificio, id_turno || null], (err, result) => {
      if (err) return res.status(500).json({ error: 'Error guardando invitado' });
      res.json({ mensaje: 'Invitado registrado', id_invitado: result.insertId });
    }
  );
};

export const obtenerReporte = (req, res) => {
    const { turno_id } = req.query;
    if (!turno_id) return res.status(400).json({ error: 'Falta turno_id' });
  
    const sql = `SELECT tipo, COUNT(*) AS total FROM entradas WHERE id_turno = ? GROUP BY tipo`;
    db.query(sql, [turno_id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error generando reporte' });
      res.json({ turno_id, resumen: rows });
    });
};