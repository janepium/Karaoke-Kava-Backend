import { Request, Response } from 'express';
import { ComunidadService } from '../services/comunidad.service';

const comunidadService = new ComunidadService();

export class ComunidadController {
  
  async getLeaderboard(req: Request, res: Response) {
    try {
      const data = await comunidadService.getLeaderboard();
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Error al obtener leaderboard' });
    }
  }

  async getFeed(req: Request, res: Response) {
    try {
      const data = await comunidadService.getFeed();
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Error al obtener feed' });
    }
  }

  async getTopCanciones(req: Request, res: Response) {
    try {
      const data = await comunidadService.getTopCanciones();
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Error al obtener top canciones' });
    }
  }

  async getPerfil(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await comunidadService.getPerfil(id as string);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Error al obtener perfil' });
    }
  }
}
