import express from 'express';
import cors from 'cors';
import { UPLOADS_DIR } from './middlewares/upload.js';
import fotoRoutes from './routes/fotoRoutes.js';
import turnoRoutes from './routes/turnoRoutes.js';
import entradaRoutes from './routes/entradaRoutes.js';
import morgan from 'morgan';


const app = express();


// Middlewares Globales
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

// Servir estáticos
app.use('/uploads', express.static(UPLOADS_DIR));

// Rutas
app.use('/api', fotoRoutes);
app.use('/api', turnoRoutes);
app.use('/api', entradaRoutes); 

// Ruta Health Check
app.get('/get', (req, res) => {
    res.send('Modulo Server activo');
});

export default app;