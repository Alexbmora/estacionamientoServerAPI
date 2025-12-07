import db from '../config/db.js';

export const subirFoto = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió ninguna imagen' });

  const rutaRelativa = `/uploads/${req.file.filename}`;
  const data = {
    nombre_original: req.file.originalname,
    nombre_guardado: req.file.filename,
    ruta: rutaRelativa,
    mimetype: req.file.mimetype,
    size: req.file.size
  };

  const sql = `INSERT INTO fotos (nombre_original, nombre_guardado, ruta, mimetype, size) VALUES (?, ?, ?, ?, ?)`;
  
  db.query(sql, [data.nombre_original, data.nombre_guardado, data.ruta, data.mimetype, data.size], (err, result) => {
      if (err) {
        console.error('Error en BD:', err);
        return res.status(500).json({ error: 'Error guardando en BD' });
      }
      data.id = result.insertId;
      res.json({ mensaje: 'Foto subida correctamente', foto: data });
    }
  );
};

export const listarFotos = (req, res) => {
  db.query('SELECT * FROM fotos ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error consultando BD' });
    res.json(rows);
  });
};

export const procesarFotoML = (req, res) => {
  const { foto_id, resultado, confianza, foto_procesada, id_turno, crearEntrada } = req.body;

  if (!foto_id || !resultado) return res.status(400).json({ error: 'Faltan campos: foto_id y resultado' });

  const sqlClasif = `INSERT INTO clasificaciones (id_foto, resultado, confianza, foto_procesada) VALUES (?, ?, ?, ?)`;

  db.query(sqlClasif, [foto_id, resultado, confianza || null, foto_procesada || null], (errClasif, resultClasif) => {
      if (errClasif) {
        console.error("Error en clasificaciones, probando respuestas_ml:", errClasif);
        // Fallback
        const sqlSimple = `INSERT INTO respuestas_ml (foto_id, resultado) VALUES (?, ?)`;
        return db.query(sqlSimple, [foto_id, resultado], (err2, result2) => {
          if (err2) return res.status(500).json({ error: "Error guardando respuesta ML" });
          return res.json({ mensaje: "Respuesta ML guardada (respuestas_ml)", id_respuesta: result2.insertId });
        });
      }

      // Si se pidió crear entrada en el estacionamiento
      if (crearEntrada) {
        db.query(`INSERT INTO entradas (id_turno, id_foto, tipo) VALUES (?, ?, ?)`,
          [id_turno || null, foto_id, resultado],
          (err3) => err3 && console.error("Error creando entrada:", err3)
        );
      }

      res.json({ mensaje: "Respuesta ML guardada (clasificaciones)", id_clasificacion: resultClasif.insertId });
    }
  );
};

export const obtenerResultadoFoto = (req, res) => {
    const id = parseInt(req.params.id, 10);
    
    // Lógica compleja de consulta aquí (tu código original)...
    const sqlClasif = `SELECT id_foto AS foto_id, resultado, confianza, foto_procesada, procesado_en FROM clasificaciones WHERE id_foto = ? ORDER BY procesado_en DESC LIMIT 1`;

    db.query(sqlClasif, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error BD' });
        if (rows.length > 0) return res.json(rows[0]);

        const sqlSimple = `SELECT foto_id, resultado, fecha FROM respuestas_ml WHERE foto_id = ? ORDER BY fecha DESC LIMIT 1`;
        db.query(sqlSimple, [id], (err2, rows2) => {
             if (err2) return res.status(500).json({ error: 'Error BD' });
             if (rows2.length > 0) return res.json(rows2[0]);
             res.status(404).json({ foto_id: id, resultado: null, mensaje: "Sin clasificación" });
        });
    });
};