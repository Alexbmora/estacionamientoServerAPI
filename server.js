//PRIMERA PARTE DEL CODIGO, IMPORTAR DEPENDENCIAS Y CONFIG. EXPRESS
require('dotenv').config({ path: './.env' });        // Para leer variables del archivo .env
const express = require('express');   // Servidor web (1)
const multer = require('multer');     // Manejar archivos (fotos)
const path = require('path');         // Manejo de rutas
const fs = require('fs');             // Verificar carpetas / crear
const mysql = require('mysql2');      // Conectarnos a MySQL

const app = express(); //(1)
const PORT = process.env.PORT || 3000;

// Middleware general
app.use(express.json()); //(3) (permite que express entienda json enviado por otros modulos)
app.use(require('cors')());


//SEGUNDA PARTE DEL CODIGO, CONECTAR MYSQL (UNISERVERZ)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});

//TERCERA PARTE DEL CODIGO - CREAR O ASEGURAR LA EXISTENCIA DE LA CARPETA UPLOADS
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

//CUARTA PARTE - SERVIR IMAGENES ESTATICAS
app.use('/uploads', express.static(UPLOADS_DIR));


//QUINTA PARTE - CONFIGURAR MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

// ================================
//  SUBIR FOTO
// ================================
app.post('/api/subir-foto', upload.single('archivo'), (req, res) => { //(2)

  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  const rutaRelativa = `/uploads/${req.file.filename}`;

  const data = {
    nombre_original: req.file.originalname,
    nombre_guardado: req.file.filename,
    ruta: rutaRelativa,
    mimetype: req.file.mimetype,
    size: req.file.size
  };

  db.query(
    `INSERT INTO fotos (nombre_original, nombre_guardado, ruta, mimetype, size)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.nombre_original,
      data.nombre_guardado,
      data.ruta,
      data.mimetype,
      data.size
    ],
    (err, result) => {
      if (err) {
        console.error('Error en BD:', err);
        return res.status(500).json({ error: 'Error guardando en BD' });
      }

      data.id = result.insertId;

      res.json({
        mensaje: 'Foto subida correctamente',
        foto: data
      });
    }
  );
});

// ================================
// LISTAR FOTOS
// ================================
app.get('/api/fotos', (req, res) => {
  db.query(
    'SELECT * FROM fotos ORDER BY id DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error consultando BD' });
      res.json(rows);
    }
  );
});

// ================================
// INICIAR TURNO
// ================================
app.post('/api/turno/iniciar', (req, res) => {
  db.query('INSERT INTO turnos (iniciado_en) VALUES (NOW())', (err, result) => {
    if (err) return res.status(500).json({ error: 'Error iniciando turno' });
    res.json({ mensaje: 'Turno iniciado', id_turno: result.insertId });
  });
});

// ================================
// TERMINAR TURNO
// ================================
app.post('/api/turno/terminar', (req, res) => {
  const { id_turno } = req.body;
  if (!id_turno) return res.status(400).json({ error: 'Falta id_turno' });

  db.query(
    'UPDATE turnos SET terminado_en = NOW() WHERE id = ?',
    [id_turno],
    (err) => {
      if (err) return res.status(500).json({ error: 'Error terminando turno' });
      res.json({ mensaje: 'Turno terminado' });
    }
  );
});

// ================================
// REGISTRAR INVITADO
// ================================
app.post('/api/invitado', (req, res) => {
  const { nombre, edificio, id_turno } = req.body;

  if (!nombre || !edificio)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });

  db.query(
    `INSERT INTO invitados (nombre, edificio, id_turno)
     VALUES (?, ?, ?, ?)`,
    [nombre, edificio|| null, id_turno || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error guardando invitado' });
      res.json({ mensaje: 'Invitado registrado', id_invitado: result.insertId });
    }
  );
});

// ================================
// PROCESAR FOTO DESDE ML
// ================================
app.post('/api/procesar-foto', (req, res) => {
  const { foto_id, resultado, confianza, foto_procesada, id_turno, crearEntrada } = req.body;

  if (!foto_id || !resultado)
    return res.status(400).json({ error: 'Faltan campos: foto_id y resultado' });

  // Intentar guardar en tabla clasificaciones (más completa)
  const sqlClasif =
    `INSERT INTO clasificaciones (id_foto, resultado, confianza, foto_procesada)
     VALUES (?, ?, ?, ?)`;

  db.query(sqlClasif,
    [foto_id, resultado, confianza || null, foto_procesada || null],
    (errClasif, resultClasif) => {

      if (errClasif) {
        console.error("Error en clasificaciones, probando respuestas_ml:", errClasif);

        // fallback a tabla básica
        const sqlSimple =
          `INSERT INTO respuestas_ml (foto_id, resultado) VALUES (?, ?)` ;

        return db.query(sqlSimple, [foto_id, resultado], (err2, result2) => {
          if (err2) {
            console.error("Error guardando en respuestas_ml:", err2);
            return res.status(500).json({ error: "Error guardando respuesta" });
          }

          return res.json({
            mensaje: "Respuesta ML guardada (respuestas_ml)",
            id_respuesta: result2.insertId
          });
        });
      }

      // si insertó bien en clasificaciones, crear entrada (solo si se pidió)
      if (crearEntrada) {
        db.query(
          `INSERT INTO entradas (id_turno, id_foto, tipo)
           VALUES (?, ?, ?)`,
          [id_turno || null, foto_id, resultado],
          (err3) => err3 && console.error("Error creando entrada:", err3)
        );
      }

      res.json({
        mensaje: "Respuesta ML guardada (clasificaciones)",
        id_clasificacion: resultClasif.insertId
      });
    }
  );
});

// ================================
// CONSULTAR RESULTADO DE FOTO (versión correcta)
// ================================
app.get('/api/foto/:id/resultado', (req, res) => {
  const id = parseInt(req.params.id, 10);

  const sqlClasif = `
    SELECT id_foto AS foto_id, resultado, confianza, foto_procesada, procesado_en
    FROM clasificaciones
    WHERE id_foto = ?
    ORDER BY procesado_en DESC
    LIMIT 1
  `;

  db.query(sqlClasif, [id], (err, rows) => {
    if (err) {
      console.error("Error consultando clasificaciones:", err);
      return res.status(500).json({ error: 'Error BD' });
    }

    if (rows.length > 0) {
      return res.json(rows[0]);
    }

    const sqlSimple = `
      SELECT foto_id, resultado, fecha
      FROM respuestas_ml
      WHERE foto_id = ?
      ORDER BY fecha DESC
      LIMIT 1
    `;

    db.query(sqlSimple, [id], (err2, rows2) => {
      if (err2) {
        console.error("Error consultando respuestas_ml:", err2);
        return res.status(500).json({ error: 'Error BD' });
      }

      if (rows2.length > 0) {
        return res.json(rows2[0]);
      }

      res.status(404).json({
        foto_id: id,
        resultado: null,
        mensaje: "La foto aún no tiene clasificación"
      });
    });
  });
});

// ================================
// REPORTE POR TURNO
// ================================
app.get('/api/reporte', (req, res) => {
  const { turno_id } = req.query;

  if (!turno_id)
    return res.status(400).json({ error: 'Falta turno_id' });

  const sql =
    `SELECT tipo, COUNT(*) AS total
     FROM entradas
     WHERE id_turno = ?
     GROUP BY tipo`;

  db.query(sql, [turno_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error generando reporte' });
    res.json({ turno_id, resumen: rows });
  });
});

// ================================
// RUTA PRINCIPAL
// ================================
app.get('/get', (req, res) => {
  res.send('Servidor activo. Usa POST /api/subir-foto para subir imágenes.');
});

console.log("Variables cargadas:", {
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME
});

// ================================
// INICIAR SERVIDOR
// ================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
