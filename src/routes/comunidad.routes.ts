import { Router } from 'express';
import { ComunidadController } from '../controllers/comunidad.controller';

const router = Router();
const comunidadController = new ComunidadController();

router.get('/leaderboard', comunidadController.getLeaderboard);
router.get('/feed', comunidadController.getFeed);
router.get('/top-canciones', comunidadController.getTopCanciones);
router.get('/perfil/:id', comunidadController.getPerfil);

export default router;
