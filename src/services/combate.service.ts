import { supabase } from '../config/supabase';

export class CombateService {

  // 0. Buscar usuarios para invitar (Autocompletado)
  async buscarUsuarios(query: string, idExcluido: string) {
    const { data, error } = await supabase
      .from('tbl_usuario')
      .select('id, nombre, apellido, id_nivel, auth_uid')
      .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
      .neq('id', idExcluido)
      .limit(10);

    if (error) throw new Error(error.message);
    return data;
  }

  // 1. Crear invitación manual
  async invitarUsuario(idJugador1: string, idJugador2: string) {
    const { data, error } = await supabase
      .from('tbl_combate')
      .insert({
        id_usuario_jugador1: idJugador1,
        id_usuario_jugador2: idJugador2,
        id_estado: 1 // Asumiendo que 1 es 'pendiente/invitado'. Ajustar si usan UUIDs para estados o texto
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // 2. Buscar oponente automáticamente (Matchmaking)
  async buscarOponente(idJugador1: string, idNivel: string) {
    // Buscar si hay alguien del mismo nivel buscando oponente
    // Primero buscar combates en estado 'buscando' donde jugador2 es null y jugador1 tiene mismo nivel
    
    // Obtenemos combates en estado 'buscando' (ej. id_estado = 2)
    const { data: combatesBuscando, error: errBusqueda } = await supabase
      .from('tbl_combate')
      .select(`
        *,
        jugador1:tbl_usuario!id_usuario_jugador1(id_nivel)
      `)
      .eq('id_estado', 2)
      .is('id_usuario_jugador2', null)
      .neq('id_usuario_jugador1', idJugador1); // No emparejarse consigo mismo

    if (errBusqueda) throw new Error(errBusqueda.message);

    // Filtrar por nivel
    const posibles = combatesBuscando.filter(c => c.jugador1.id_nivel === idNivel);

    if (posibles.length > 0) {
      // Elegir uno aleatoriamente
      const combateElegido = posibles[Math.floor(Math.random() * posibles.length)];
      
      // Emparejar y cambiar estado a 'en_curso' (ej. id_estado = 3)
      const { data, error } = await supabase
        .from('tbl_combate')
        .update({
          id_usuario_jugador2: idJugador1,
          id_estado: 3 // en_curso
        })
        .eq('id', combateElegido.id)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return { status: 'match_found', combate: data };
    } else {
      // Crear nuevo registro buscando oponente
      const { data, error } = await supabase
        .from('tbl_combate')
        .insert({
          id_usuario_jugador1: idJugador1,
          id_estado: 2 // buscando
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { status: 'waiting', combate: data };
    }
  }

  // 3. Aceptar Combate (Invitación manual)
  async aceptarCombate(idCombate: string) {
    const { data, error } = await supabase
      .from('tbl_combate')
      .update({ id_estado: 3 }) // en_curso
      .eq('id', idCombate)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // 3b. Rechazar Combate (Elimina la invitación pendiente)
  async rechazarCombate(idCombate: string) {
    const { error } = await supabase
      .from('tbl_combate')
      .delete()
      .eq('id', idCombate)
      .eq('id_estado', 1); // Solo se pueden rechazar invitaciones pendientes

    if (error) throw new Error(error.message);
    return { ok: true };
  }

  // 4. Crear Ronda (El selector elige la canción)
  async crearRonda(idCombate: string, numeroRonda: number, idCancion: string, idSelector: string) {
    const { data, error } = await supabase
      .from('tbl_rondas')
      .insert({
        id_combate: idCombate,
        numero_ronda: numeroRonda,
        id_cancion: idCancion,
        id_usuario_selector: idSelector,
        id_estado: 1 // pendiente
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // 5. Registrar Turno
  async registrarTurno(idRonda: string, idUsuario: string, puntaje: number, urlAudio: string, feedback: any, transcripcion: string) {
    const { data, error } = await supabase
      .from('tbl_turnos')
      .insert({
        id_rondas: idRonda,
        id_usuario: idUsuario,
        puntaje: puntaje,
        url_audio_usuario: urlAudio,
        feedback: feedback,
        transcripcion: transcripcion,
        id_estado: 2 // completado
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Revisar si ya están los dos turnos para declarar ganador de la ronda
    await this.evaluarRonda(idRonda);

    return data;
  }

  private async evaluarRonda(idRonda: string) {
    // Traer todos los turnos de la ronda
    const { data: turnos, error } = await supabase
      .from('tbl_turnos')
      .select('*')
      .eq('id_rondas', idRonda);

    if (error) throw new Error(error.message);

    // Si hay 2 turnos completados
    if (turnos.length === 2) {
      let ganadorRonda = turnos[0];
      if (turnos[1].puntaje > turnos[0].puntaje) {
        ganadorRonda = turnos[1];
      } else if (turnos[1].puntaje === turnos[0].puntaje) {
        // En caso de empate exacto, gana el que cantó primero por ahora (o se puede dejar null)
      }

      // Actualizar ronda
      const { data: rondaActualizada, error: errRonda } = await supabase
        .from('tbl_rondas')
        .update({
          id_usuario_ganador: ganadorRonda.id_usuario,
          id_estado: 2 // completada
        })
        .eq('id', idRonda)
        .select()
        .single();

      if (errRonda) throw new Error(errRonda.message);

      // Evaluar si ya hay ganador del combate
      await this.evaluarCombate(rondaActualizada.id_combate);
    }
  }

  private async evaluarCombate(idCombate: string) {
    // Traer todas las rondas completadas
    const { data: rondas, error } = await supabase
      .from('tbl_rondas')
      .select('*')
      .eq('id_combate', idCombate)
      .not('id_usuario_ganador', 'is', null);

    if (error) throw new Error(error.message);

    // Contar victorias
    const victorias: Record<string, number> = {};
    for (const r of rondas) {
      victorias[r.id_usuario_ganador] = (victorias[r.id_usuario_ganador] || 0) + 1;
    }

    let ganadorCombate: string | null = null;
    let hayDesempate = false;

    // Buscar si alguien tiene 2 victorias
    for (const [idUsuario, count] of Object.entries(victorias)) {
      if (count >= 2) {
        ganadorCombate = idUsuario;
      }
    }

    // Si hay 2 rondas y están 1 a 1, iniciar desempate
    if (rondas.length === 2 && !ganadorCombate) {
      hayDesempate = true;
    }

    if (ganadorCombate) {
      // Actualizar combate
      await supabase
        .from('tbl_combate')
        .update({
          id_usuario_ganador: ganadorCombate,
          id_estado: 4 // finalizado
        })
        .eq('id', idCombate);
    } else if (hayDesempate) {
      // Lógica de desempate
      await this.crearRondaDesempate(idCombate, rondas);
    }
  }

  private async crearRondaDesempate(idCombate: string, rondasPrevias: any[]) {
    const idsCancionesPrevias = rondasPrevias.map(r => r.id_cancion);

    // 1. Obtener los géneros de las canciones ya cantadas
    const { data: generosPrevios } = await supabase
      .from('tbl_genero_musical_x_cancion')
      .select('id_genero_musical')
      .in('id_cancion', idsCancionesPrevias);

    const idsGenerosPrevios = (generosPrevios || []).map(g => g.id_genero_musical);

    // 2. Obtener todas las canciones con sus géneros
    const { data: canciones, error } = await supabase
      .from('tbl_cancion')
      .select('id, tbl_genero_musical_x_cancion(id_genero_musical)');

    if (error || !canciones) return;

    // 3. Filtrar para no repetir canciones
    let cancionesDisponibles = canciones.filter(c => !idsCancionesPrevias.includes(c.id));
    
    // 4. Intentar filtrar canciones que tengan géneros DISTINTOS a los previos
    const cancionesConGeneroDiferente = cancionesDisponibles.filter(c => {
      // array de generos de esta cancion
      const generos = c.tbl_genero_musical_x_cancion.map((g: any) => g.id_genero_musical);
      // Queremos que no haya intersección con los géneros previos
      return !generos.some((g: any) => idsGenerosPrevios.includes(g));
    });

    // Si hay canciones de otros géneros, usamos esas. Si no, hacemos fallback a todas las disponibles.
    if (cancionesConGeneroDiferente.length > 0) {
      cancionesDisponibles = cancionesConGeneroDiferente;
    }

    if (cancionesDisponibles.length > 0) {
      // Seleccionar una al azar
      const seleccionada = cancionesDisponibles[Math.floor(Math.random() * cancionesDisponibles.length)];
      
      // Crear la ronda 3
      await supabase
        .from('tbl_rondas')
        .insert({
          id_combate: idCombate,
          numero_ronda: 3,
          id_cancion: seleccionada.id,
          id_estado: 1 // pendiente
        });
    }
  }

  // 6. Obtener combates del usuario (historial e invitaciones)
  async obtenerCombatesUsuario(idUsuario: string) {
    const { data, error } = await supabase
      .from('tbl_combate')
      .select(`
        *,
        jugador1:tbl_usuario!id_usuario_jugador1(*),
        jugador2:tbl_usuario!id_usuario_jugador2(*)
      `)
      .or(`id_usuario_jugador1.eq.${idUsuario},id_usuario_jugador2.eq.${idUsuario}`);

    if (error) throw new Error(error.message);
    return data;
  }
  
  // 7. Obtener el detalle de un combate con sus rondas y turnos
  async obtenerDetalleCombate(idCombate: string) {
    const { data, error } = await supabase
      .from('tbl_combate')
      .select(`
        *,
        jugador1:tbl_usuario!id_usuario_jugador1(*),
        jugador2:tbl_usuario!id_usuario_jugador2(*),
        rondas:tbl_rondas(
          *,
          cancion:tbl_cancion(*),
          turnos:tbl_turnos(
            *,
            usuario:tbl_usuario(*)
          )
        )
      `)
      .eq('id', idCombate)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
