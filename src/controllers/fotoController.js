import db from '../config/db.js';
import path from 'path'; 
import fs from 'fs';
import { UPLOADS_DIR } from '../middlewares/upload.js';

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

  const sql = `CALL sp_subir_foto(?, ?, ?, ?, ?)`;

  db.query(sql, [data.nombre_original, data.nombre_guardado, data.ruta, data.mimetype, data.size], (err, result) => {
    if (err) {
      console.error('Error en BD:', err);
      return res.status(500).json({ error: 'Error guardando en BD' });
    }

    const idRow = result && result[0] && result[0].length > 0 ? result[0][0] : null;

    if (!idRow || !idRow.id) {
      console.error('Error: No se pudo recuperar el ID de la foto del Stored Procedure.');
      return res.status(500).json({ error: 'Error interno: No se pudo obtener el ID de la foto.' });
    }

    // Asignar el ID recuperado del Stored Procedure
    data.id = idRow.id;
    // ----------------------------------------------------------

    const io = req.app.get('io');

    // Emisión a Python (ahora con el ID correcto)
    io.emit('nueva-foto', {
      id: data.id, // ¡Ahora tiene el ID correcto!
      nombre_guardado: data.nombre_guardado,
    });

    res.json({ mensaje: 'Foto subida correctamente', foto: data });
  });
};

export const descargarFotoData = (req, res) => {
  const filename = req.params.filename;
  // Seguridad básica de rutas
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Ruta inválida' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Imagen no encontrada en servidor' });
  }
};

export const notificarResultadoFoto = (req, res) => {
  const { id, resultado } = req.body;

  if (!id || !resultado) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const io = req.app.get('io');
    io.emit('foto_procesada', {
      foto_id: id,          // Para que Android sepa qué foto es
      resultado: resultado,      // "Docente", "Alumno", "Personal", "Desconocido"
    });

    console.log(`📡 Relay WS: Resultado '${resultado}' enviado a Android (ID: ${id})`);

    // Respondemos a Python para que sepa que el mensaje se entregó
    res.json({ mensaje: "Notificación retransmitida a Android correctamente" });

  } catch (error) {
    console.error("Error al emitir WebSocket:", error);
    res.status(500).json({ error: "Error interno al notificar" });
  }
}

export const listarFotos = (req, res) => {
  db.query('SELECT * FROM fotos ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error consultando BD' });
    res.json(rows);
  });
};