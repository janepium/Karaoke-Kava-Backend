import { Router } from 'express';
import { ScoreController } from '../controllers/score.controller';

const router = Router();
const scoreController = new ScoreController();

router.post('/update', scoreController.update.bind(scoreController));
router.post('/finalize', scoreController.finalize.bind(scoreController));

export default router;
