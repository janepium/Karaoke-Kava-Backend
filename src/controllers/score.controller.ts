import { Request, Response } from 'express';
import { ScoreService } from '../services/score.service';

const scoreService = new ScoreService();

export class ScoreController {

  async update(req: Request, res: Response) {
    try {
      const { songId, userId, pitchScore, lyricsScore, timestamp } = req.body;

      if (
        songId == null ||
        userId == null ||
        pitchScore == null ||
        lyricsScore == null ||
        timestamp == null
      ) {
        return res.status(400).json({
          ok: false,
          message: 'Faltan campos requeridos: songId, userId, pitchScore, lyricsScore, timestamp'
        });
      }

      const resultado = await scoreService.actualizarPuntajeParcial({
        id_usuario: Number(userId),
        id_cancion: Number(songId),
        puntaje_pitch: Number(pitchScore),
        puntaje_letra: Number(lyricsScore)
      });

      return res.status(200).json({
        ok: true,
        data: resultado
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Error al actualizar puntaje'
      });
    }
  }

  async finalize(req: Request, res: Response) {
    try {
      const { songId, userId, finalPitchScore, finalLyricsScore } = req.body;

      if (
        songId == null ||
        userId == null ||
        finalPitchScore == null ||
        finalLyricsScore == null
      ) {
        return res.status(400).json({
          ok: false,
          message: 'Faltan campos requeridos: songId, userId, finalPitchScore, finalLyricsScore'
        });
      }

      const resultado = await scoreService.finalizarPuntaje({
        id_usuario: Number(userId),
        id_cancion: Number(songId),
        puntaje_pitch_final: Number(finalPitchScore),
        puntaje_letra_final: Number(finalLyricsScore)
      });

      return res.status(200).json({
        ok: true,
        data: resultado
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Error al finalizar puntaje'
      });
    }
  }
}
