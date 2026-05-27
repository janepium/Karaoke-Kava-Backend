import { Request, Response } from 'express';
import { EvaluacionesService } from '../services/evaluaciones.service';

const evaluacionesService = new EvaluacionesService();

export class EvaluacionesController {
  async evaluarPractica(req: Request, res: Response) {
    try {
      const resultado = await evaluacionesService.evaluarPractica(req.body);

      return res.status(200).json({
        ok: true,
        data: resultado
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Error al evaluar práctica'
      });
    }
  }
}