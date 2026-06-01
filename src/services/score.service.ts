/*
  Ejecutar en Supabase SQL Editor antes de usar este servicio:

  CREATE TABLE tbl_puntaje (
    id           SERIAL       PRIMARY KEY,
    id_usuario   INTEGER      NOT NULL,
    id_cancion   INTEGER      NOT NULL,
    puntaje_pitch NUMERIC(5,2) NOT NULL DEFAULT 0,
    puntaje_letra NUMERIC(5,2) NOT NULL DEFAULT 0,
    puntaje_final NUMERIC(5,2),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (id_usuario, id_cancion)
  );
*/

import { supabase } from '../config/supabase';

type ActualizarPuntajeParcialInput = {
  id_usuario: number;
  id_cancion: number;
  puntaje_pitch: number;
  puntaje_letra: number;
};

type FinalizarPuntajeInput = {
  id_usuario: number;
  id_cancion: number;
  puntaje_pitch_final: number;
  puntaje_letra_final: number;
};

export class ScoreService {

  async actualizarPuntajeParcial(data: ActualizarPuntajeParcialInput) {
    const { error } = await supabase
      .from('tbl_puntaje')
      .upsert(
        {
          id_usuario: data.id_usuario,
          id_cancion: data.id_cancion,
          puntaje_pitch: data.puntaje_pitch,
          puntaje_letra: data.puntaje_letra
        },
        { onConflict: 'id_usuario,id_cancion' }
      );

    if (error) {
      // Non-fatal: log and continue. Endpoint still acknowledges receipt.
      console.warn('tbl_puntaje no disponible (update):', error.message);
    }

    return { received: true };
  }

  async finalizarPuntaje(data: FinalizarPuntajeInput) {
    const puntajeFinal =
      Math.round((data.puntaje_pitch_final * 0.6 + data.puntaje_letra_final * 0.4) * 100) / 100;

    // Persistence is best-effort — score is returned regardless
    const { error } = await supabase
      .from('tbl_puntaje')
      .upsert(
        {
          id_usuario: data.id_usuario,
          id_cancion: data.id_cancion,
          puntaje_pitch: data.puntaje_pitch_final,
          puntaje_letra: data.puntaje_letra_final,
          puntaje_final: puntajeFinal
        },
        { onConflict: 'id_usuario,id_cancion' }
      );

    if (error) {
      console.warn('tbl_puntaje no disponible (finalize):', error.message);
    }

    return {
      finalScore: puntajeFinal,
      pitchScore: data.puntaje_pitch_final,
      lyricsScore: data.puntaje_letra_final,
      label: this.calcularEtiqueta(puntajeFinal)
    };
  }

  private calcularEtiqueta(puntaje: number): string {
    if (puntaje >= 75) return 'Perfect!';
    if (puntaje >= 55) return 'Great!';
    if (puntaje >= 35) return 'Good';
    return 'Keep practicing';
  }
}
