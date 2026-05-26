import { supabase } from '../config/supabase';

type CrearPracticaInput = {
  id_usuario: number;
  id_cancion: number;
  id_estado: number;
  url_audio_usuario: string;
};

type ActualizarResultadoPracticaInput = {
  puntaje: number;
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
    const { data: result, error } = await supabase
      .from('tbl_practica')
      .update({
        puntaje: data.puntaje,
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

    return result;
  }
}