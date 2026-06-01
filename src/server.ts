import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cancionesRoutes from './routes/canciones.routes';
import practicasRoutes from './routes/practicas.routes';
import evaluacionesRoutes from './routes/evaluaciones.routes';
import combateRoutes from './routes/combate.routes';
import comunidadRoutes from './routes/comunidad.routes';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

app.use(cors({
  origin: FRONTEND_URL
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend Karaoke Kava funcionando'
  });
});

app.use('/api/canciones', cancionesRoutes);
app.use('/api/practicas', practicasRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/combates', combateRoutes);
app.use('/api/comunidad', comunidadRoutes);

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});