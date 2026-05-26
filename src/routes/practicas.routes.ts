import { Router } from 'express';
import { PracticasController } from '../controllers/practicas.controller';

const router = Router();
const practicasController = new PracticasController();

router.post('/', practicasController.crearPractica.bind(practicasController));
router.patch('/:id/resultado', practicasController.actualizarResultadoPractica.bind(practicasController));

export default router;