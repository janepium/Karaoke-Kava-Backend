import { supabase } from '../config/supabase';

type CancionInput = {
  titulo: string;
  duracion: number;
  letra: string;
  url_audio: string;
  nombresArtistas: string[];
  nombresGeneros: string[];
};

export class CancionesService {

  async obtenerCanciones() {
    const { data, error } = await supabase
      .from('tbl_cancion')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async obtenerCancionPorId(id: number) {
    const { data, error } = await supabase
      .from('tbl_cancion')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Traer los artistas desde la tabla intermedia (igual que obtenerCancionesAdmin)
    const { data: artistasRaw } = await supabase
      .from('tbl_artista_x_cancion')
      .select('tbl_artista(id, nombre)')
      .eq('id_cancion', id);

    const artistas = (artistasRaw ?? [])
      .map((item: any) => item.tbl_artista?.nombre)
      .filter(Boolean);

    return { ...data, artistas };
  }

  async obtenerCancionesAdmin() {
    const canciones = await this.obtenerCanciones();

    const cancionesConRelaciones = await Promise.all(
      (canciones ?? []).map(async (cancion: any) => {
        const { data: artistas, error: errorArtistas } = await supabase
          .from('tbl_artista_x_cancion')
          .select('tbl_artista(id, nombre)')
          .eq('id_cancion', cancion.id);

        if (errorArtistas) {
          throw new Error(errorArtistas.message);
        }

        const { data: generos, error: errorGeneros } = await supabase
          .from('tbl_genero_musical_x_cancion')
          .select('tbl_genero_musical(id, nombre)')
          .eq('id_cancion', cancion.id);

        if (errorGeneros) {
          throw new Error(errorGeneros.message);
        }

        return {
          ...cancion,
          artistas: artistas?.map((item: any) => item.tbl_artista?.nombre).filter(Boolean) ?? [],
          generos: generos?.map((item: any) => item.tbl_genero_musical?.nombre).filter(Boolean) ?? []
        };
      })
    );

    return cancionesConRelaciones;
  }

  async crearCancion(cancion: CancionInput) {
    const { data: cancionCreada, error: errorCancion } = await supabase
      .from('tbl_cancion')
      .insert({
        titulo: cancion.titulo,
        duracion: cancion.duracion,
        letra: cancion.letra,
        url_audio: cancion.url_audio
      })
      .select()
      .single();

    if (errorCancion) {
      throw new Error(errorCancion.message);
    }

    await this.guardarRelaciones(
      cancionCreada.id,
      cancion.nombresArtistas,
      cancion.nombresGeneros
    );

    return cancionCreada;
  }

  async actualizarCancion(id: number, cancion: CancionInput) {
    const { data: cancionActualizada, error } = await supabase
      .from('tbl_cancion')
      .update({
        titulo: cancion.titulo,
        duracion: cancion.duracion,
        letra: cancion.letra,
        url_audio: cancion.url_audio
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await supabase
      .from('tbl_artista_x_cancion')
      .delete()
      .eq('id_cancion', id);

    await supabase
      .from('tbl_genero_musical_x_cancion')
      .delete()
      .eq('id_cancion', id);

    await this.guardarRelaciones(
      id,
      cancion.nombresArtistas,
      cancion.nombresGeneros
    );

    return cancionActualizada;
  }

  async eliminarCancion(id: number) {
    const { error: errorArtistas } = await supabase
      .from('tbl_artista_x_cancion')
      .delete()
      .eq('id_cancion', id);

    if (errorArtistas) {
      throw new Error(errorArtistas.message);
    }

    const { error: errorGeneros } = await supabase
      .from('tbl_genero_musical_x_cancion')
      .delete()
      .eq('id_cancion', id);

    if (errorGeneros) {
      throw new Error(errorGeneros.message);
    }

    const { error } = await supabase
      .from('tbl_cancion')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return {
      message: 'Canción eliminada correctamente'
    };
  }

  private async guardarRelaciones(
    idCancion: number,
    nombresArtistas: string[],
    nombresGeneros: string[]
  ) {
    for (const nombreArtista of nombresArtistas ?? []) {
      let { data: artista, error: errorBuscarArtista } = await supabase
        .from('tbl_artista')
        .select('*')
        .eq('nombre', nombreArtista)
        .maybeSingle();

      if (errorBuscarArtista) {
        throw new Error(errorBuscarArtista.message);
      }

      if (!artista) {
        const { data: nuevoArtista, error } = await supabase
          .from('tbl_artista')
          .insert({ nombre: nombreArtista })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        artista = nuevoArtista;
      }

      const { error: errorRelacion } = await supabase
        .from('tbl_artista_x_cancion')
        .insert({
          id_artista: artista.id,
          id_cancion: idCancion
        });

      if (errorRelacion) {
        throw new Error(errorRelacion.message);
      }
    }

    for (const nombreGenero of nombresGeneros ?? []) {
      let { data: genero, error: errorBuscarGenero } = await supabase
        .from('tbl_genero_musical')
        .select('*')
        .eq('nombre', nombreGenero)
        .maybeSingle();

      if (errorBuscarGenero) {
        throw new Error(errorBuscarGenero.message);
      }

      if (!genero) {
        const { data: nuevoGenero, error } = await supabase
          .from('tbl_genero_musical')
          .insert({ nombre: nombreGenero })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        genero = nuevoGenero;
      }

      const { error: errorRelacion } = await supabase
        .from('tbl_genero_musical_x_cancion')
        .insert({
          id_cancion: idCancion,
          id_genero_musical: genero.id
        });

      if (errorRelacion) {
        throw new Error(errorRelacion.message);
      }
    }
  }
}