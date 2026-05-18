import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});