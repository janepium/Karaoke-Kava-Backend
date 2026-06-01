import { supabase } from '../config/supabase';

export class ComunidadService {
  /**
   * Obtiene el Leaderboard: Top 10 usuarios ordenados por su nivel y puntaje promedio de sus prácticas.
   */
  async getLeaderboard() {
    // Para simplificar, obtenemos todos los usuarios (en un entorno real usaríamos paginación)
    // Luego calculamos el puntaje promedio de sus prácticas
    const { data: usuarios, error } = await supabase
      .from('tbl_usuario')
      .select(`
        id,
        nombre,
        apellido,
        tbl_nivel:id_nivel (
          nombre
        )
      `)
      .eq('id_rol', 1);

    if (error) throw new Error(error.message);

    const { data: practicas, error: errorPracticas } = await supabase
      .from('tbl_practica')
      .select('id_usuario, puntaje')
      .eq('id_estado', 5);

    if (errorPracticas) throw new Error(errorPracticas.message);

    const leaderboard = usuarios.map((user: any) => {
      const practicasUser = practicas.filter((p: any) => p.id_usuario === user.id);
      const totalPuntaje = practicasUser.reduce((acc: number, curr: any) => acc + (curr.puntaje || 0), 0);
      const promedio = practicasUser.length > 0 ? (totalPuntaje / practicasUser.length) : 0;

      return {
        id: user.id,
        nombre: `${user.nombre} ${user.apellido}`,
        nivel: (user.tbl_nivel as any)?.nombre || 'Sin nivel',
        puntajePromedio: Math.round(promedio),
        totalPracticas: practicasUser.length
      };
    });

    // Ordenar de mayor a menor puntaje y tomar el Top 10
    leaderboard.sort((a, b) => b.puntajePromedio - a.puntajePromedio);
    return leaderboard.slice(0, 10);
  }

  /**
   * Obtiene el Feed de Combates recientes
   */
  async getFeed() {
    const { data: combates, error } = await supabase
      .from('tbl_combate')
      .select(`
        id,
        id_estado,
        fecha,
        jugador1:tbl_usuario!id_usuario_jugador1(id, nombre, apellido),
        jugador2:tbl_usuario!id_usuario_jugador2(id, nombre, apellido),
        ganador:tbl_usuario!id_usuario_ganador(id, nombre, apellido)
      `)
      .in('id_estado', [3, 4])
      .order('fecha', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    return combates.map((c: any) => {
      let mensaje = '';
      if (c.id_estado === 4 && c.ganador) {
        const perdedor = c.ganador.id === c.jugador1?.id ? c.jugador2 : c.jugador1;
        mensaje = `${c.ganador.nombre} ha vencido a ${perdedor?.nombre || 'Alguien'} en un duelo épico 🏆`;
      } else if (c.id_estado === 4 && !c.ganador) {
        mensaje = `${c.jugador1?.nombre || 'Alguien'} y ${c.jugador2?.nombre || 'Alguien'} terminaron un combate en empate 🤝`;
      } else {
        mensaje = `${c.jugador1?.nombre || 'Alguien'} ha desafiado a ${c.jugador2?.nombre || 'Alguien'} ⚔️`;
      }

      return {
        id: c.id,
        fecha: c.fecha,
        mensaje,
        estado: c.id_estado === 4 ? 'FINALIZADO' : 'EN_CURSO'
      };
    });
  }

  /**
   * Obtiene el Top de Canciones más usadas
   */
  async getTopCanciones() {
    const { data: practicas, error: errorPracticas } = await supabase
      .from('tbl_practica')
      .select('id_cancion')
      .eq('id_estado', 5);
    
    if (errorPracticas) throw new Error(errorPracticas.message);

    const conCount = practicas.reduce((acc: any, curr: any) => {
      if (!acc[curr.id_cancion]) {
        acc[curr.id_cancion] = 0;
      }
      acc[curr.id_cancion]++;
      return acc;
    }, {});

    const topIds = Object.keys(conCount)
      .sort((a, b) => conCount[b] - conCount[a])
      .slice(0, 5);

    if (topIds.length === 0) return [];

    const { data: canciones, error } = await supabase
      .from('tbl_cancion')
      .select('id, titulo, tbl_artista_x_cancion(tbl_artista(nombre))')
      .in('id', topIds);
      
    if (error) throw new Error(error.message);

    return canciones.map((c: any) => {
      const artistas = c.tbl_artista_x_cancion?.map((axc: any) => axc.tbl_artista?.nombre).join(', ') || 'Desconocido';
      return {
        id: c.id,
        titulo: c.titulo,
        artista: artistas,
        vecesCantada: conCount[c.id] || 0
      };
    }).sort((a, b) => b.vecesCantada - a.vecesCantada);
  }

  /**
   * Obtiene el perfil de un usuario específico y sus estadísticas
   */
  async getPerfil(idUsuario: string) {
    const { data: user, error } = await supabase
      .from('tbl_usuario')
      .select(`
        id,
        nombre,
        apellido,
        tbl_nivel:id_nivel (
          nombre
        )
      `)
      .eq('id', idUsuario)
      .single();

    if (error) throw new Error(error.message);

    const { data: practicas, error: errorPracticas } = await supabase
      .from('tbl_practica')
      .select('id_cancion, puntaje, fecha')
      .eq('id_usuario', idUsuario)
      .eq('id_estado', 5);

    if (errorPracticas) throw new Error(errorPracticas.message);

    const { data: combates, error: errorCombates } = await supabase
      .from('tbl_combate')
      .select('id_usuario_ganador')
      .or(`id_usuario_jugador1.eq.${idUsuario},id_usuario_jugador2.eq.${idUsuario}`)
      .eq('id_estado', 4);

    if (errorCombates) throw new Error(errorCombates.message);

    let mejorPuntaje = 0;
    let sumaPuntaje = 0;

    practicas.forEach((p: any) => {
      if (p.puntaje > mejorPuntaje) mejorPuntaje = p.puntaje;
      sumaPuntaje += (p.puntaje || 0);
    });

    const combatesGanados = combates.filter((c: any) => c.id_usuario_ganador == idUsuario).length;

    return {
      id: user.id,
      nombre: `${user.nombre} ${user.apellido}`,
      nivel: (user.tbl_nivel as any)?.nombre || 'Sin nivel',
      estadisticas: {
        totalPracticas: practicas.length,
        puntajePromedio: practicas.length > 0 ? Math.round(sumaPuntaje / practicas.length) : 0,
        mejorPuntaje,
        combatesJugados: combates.length,
        combatesGanados
      },
      historialReciente: practicas.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5)
    };
  }
}
