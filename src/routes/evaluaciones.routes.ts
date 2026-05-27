import { Router } from 'express';
import { EvaluacionesController } from '../controllers/evaluaciones.controller';

const router = Router();
const evaluacionesController = new EvaluacionesController();

router.post('/practica', evaluacionesController.evaluarPractica.bind(evaluacionesController));

export default router;
