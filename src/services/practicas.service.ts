import { supabase } from '../config/supabase';

type CrearPracticaInput = {
  id_usuario: number;
  id_cancion: number;
  id_estado: number;
  url_audio_usuario: string;
};

type ActualizarResultadoPracticaInput = {
  puntaje: number;
  puntajeLetra?: number;
  puntajeAudio?: number;
  puntajeVoz?: number;
  feedback: string;
  transcripcion: string;
  id_estado: number;
};

export class PracticasService {

  async crearPractica(data: CrearPracticaInput) {
    const { data: result, error } = await supabase
      .from('tbl_practica')
      .insert([
        {
          id_usuario: data.id_usuario,
          id_cancion: data.id_cancion,
          id_estado: data.id_estado,
          url_audio_usuario: data.url_audio_usuario,
          puntaje: null,
          feedback: null,
          transcripcion: null
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return result;
  }

  async actualizarResultadoPractica(
    idPractica: number,
    data: ActualizarResultadoPracticaInput
  ) {
    // 1. Actualizar el resultado de la práctica
    const { data: result, error } = await supabase
      .from('tbl_practica')
      .update({
        puntaje: data.puntaje,
        puntaje_letra: data.puntajeLetra,
        puntaje_audio: data.puntajeAudio,
        puntaje_voz: data.puntajeVoz,
        feedback: data.feedback,
        transcripcion: data.transcripcion,
        id_estado: data.id_estado
      })
      .eq('id', idPractica)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // 2. Recalcular el nivel del usuario basado en el promedio de sus puntajes
    await this.recalcularNivelUsuario(result.id_usuario);

    return result;
  }

  /**
   * Calcula el promedio de puntajes de todas las prácticas finalizadas del usuario
   * y actualiza su id_nivel en tbl_usuario según los rangos definidos en tbl_nivel.
   */
  private async recalcularNivelUsuario(idUsuario: number) {
    try {
      // Obtener todas las prácticas finalizadas con puntaje del usuario
      const { data: practicas, error: errorPracticas } = await supabase
        .from('tbl_practica')
        .select('puntaje')
        .eq('id_usuario', idUsuario)
        .eq('id_estado', 5)  // estado 5 = finalizada
        .not('puntaje', 'is', null);

      if (errorPracticas || !practicas || practicas.length === 0) return;

      // Calcular el promedio
      const suma = practicas.reduce((acc: number, p: any) => acc + (p.puntaje || 0), 0);
      const promedio = suma / practicas.length;

      // Obtener todos los niveles ordenados
      const { data: niveles, error: errorNiveles } = await supabase
        .from('tbl_nivel')
        .select('id, puntaje_min, puntaje_max')
        .order('puntaje_min', { ascending: true });

      if (errorNiveles || !niveles) return;

      // Encontrar el nivel correspondiente al promedio
      const nivelCorrespondiente = niveles.find(
        (n: any) => promedio >= n.puntaje_min && promedio <= n.puntaje_max
      ) || niveles[niveles.length - 1]; // fallback al mayor nivel

      // Actualizar el nivel y el puntaje promedio del usuario
      await supabase
        .from('tbl_usuario')
        .update({
          id_nivel: nivelCorrespondiente.id,
          puntaje_promedio: Math.round(promedio)
        })
        .eq('id', idUsuario);

    } catch (e) {
      // No interrumpir el flujo principal si esto falla
      console.error('Error al recalcular nivel del usuario:', e);
    }
  }
}