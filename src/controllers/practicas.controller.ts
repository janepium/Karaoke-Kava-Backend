import { Request, Response } from 'express';
import { PracticasService } from '../services/practicas.service';

const practicasService = new PracticasService();

export class PracticasController {

  async crearPractica(req: Request, res: Response) {
    try {
      const practica = await practicasService.crearPractica(req.body);

      return res.status(201).json({
        ok: true,
        data: practica
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Error al crear práctica'
      });
    }
  }

  async actualizarResultadoPractica(req: Request, res: Response) {
    try {
      const idPractica = Number(req.params.id);

      if (Number.isNaN(idPractica)) {
        return res.status(400).json({
          ok: false,
          message: 'El id de la práctica no es válido'
        });
      }

      const practicaActualizada = await practicasService.actualizarResultadoPractica(
        idPractica,
        req.body
      );

      return res.status(200).json({
        ok: true,
        data: practicaActualizada
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Error al actualizar práctica'
      });
    }
  }
}