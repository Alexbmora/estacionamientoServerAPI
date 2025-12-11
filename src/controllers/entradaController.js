import db from '../config/db.js';

// Esta es la función que llama al SP que necesitas
export const registrarEntradaReconocimiento = (req, res) => {
    // Los datos que la app Android enviará
    const { id_foto, id_turno, tipo } = req.body;

    // Validación de datos de entrada
    if (!id_foto || !id_turno || !tipo) {
        return res.status(400).json({
            error: 'Faltan datos para registrar la entrada (id_foto, id_turno, tipo).'
        });
    }

    // El nombre exacto del SP que me mostraste
    const sql = 'CALL sp_registrar_entrada_reconocimiento(?, ?, ?)';

    db.query(sql, [id_foto, id_turno, tipo], (err, result) => {
        if (err) {
            console.error('Error en BD al registrar entrada por reconocimiento:', err);
            return res.status(500).json({ error: 'Error interno al registrar la entrada.' });
        }

        // El SP no devuelve un ID, pero confirmamos que se ejecutó
        res.status(201).json({ mensaje: 'Entrada por reconocimiento registrada correctamente.' });
    });
};