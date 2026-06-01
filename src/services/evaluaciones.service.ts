import { supabase } from '../config/supabase';
let aiInstance: any = null;
async function getAI() {
  if (!aiInstance) {
    const { GoogleGenAI } = await eval(`import('@google/genai')`);
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

type EvaluarPracticaInput = {
  idPractica: number;
  transcripcion: string;
  duracionAudio: number;
  rmsPromedio: number;
  porcentajeSilencio: number;
  porcentajeActividad: number;
  porcentajeClipping?: number;
};

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanciaLevenshtein(a: string, b: string): number {
  const matriz: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matriz[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matriz[i][j] = matriz[i - 1][j - 1];
      } else {
        matriz[i][j] = Math.min(
          matriz[i - 1][j - 1] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j] + 1
        );
      }
    }
  }

  return matriz[b.length][a.length];
}

function palabrasParecidas(a: string, b: string): boolean {
  if (a === b) return true;

  const distancia = distanciaLevenshtein(a, b);

  if (a.length <= 4 || b.length <= 4) {
    return distancia <= 1;
  }

  return distancia <= 1;
}

function calcularSimilitud(letra: string, transcripcion: string): number {
  const palabrasLetra = normalizarTexto(letra).split(' ').filter(Boolean);
  const palabrasUsuario = normalizarTexto(transcripcion).split(' ').filter(Boolean);

  if (palabrasLetra.length === 0) return 0;

  let coincidencias = 0;

  for (const palabraLetra of palabrasLetra) {
    const existeParecida = palabrasUsuario.some((palabraUsuario) =>
      palabrasParecidas(palabraLetra, palabraUsuario)
    );

    if (existeParecida) {
      coincidencias++;
    }
  }

  return coincidencias / palabrasLetra.length;
}

function calcularCobertura(letra: string, transcripcion: string): number {
  const palabrasLetra = normalizarTexto(letra).split(' ').filter(Boolean);
  const palabrasUsuario = normalizarTexto(transcripcion).split(' ').filter(Boolean);

  if (palabrasLetra.length === 0) return 0;

  let coincidencias = 0;

  for (const palabraLetra of palabrasLetra) {
    const existeParecida = palabrasUsuario.some((palabraUsuario) =>
      palabrasParecidas(palabraLetra, palabraUsuario)
    );

    if (existeParecida) {
      coincidencias++;
    }
  }

  return coincidencias / palabrasLetra.length;
}

function calcularCalidadAudio(duracion: number, cantidadPalabras: number): number {
  // Si no hay palabras detectadas o la duración es mínima, puntaje es 0
  if (cantidadPalabras === 0 || duracion < 2) return 0;

  let puntajeDuracion = 0;

  if (duracion > 20) puntajeDuracion = 10;
  else if (duracion > 10) puntajeDuracion = 7;
  else if (duracion > 5) puntajeDuracion = 4;
  else puntajeDuracion = 0;

  const densidad = cantidadPalabras / Math.max(duracion, 1);

  let puntajeContinuidad = 0;

  if (densidad > 2) puntajeContinuidad = 15;
  else if (densidad > 1) puntajeContinuidad = 10;
  else if (densidad > 0.5) puntajeContinuidad = 5;
  else puntajeContinuidad = 0;

  let puntajeGeneral = 0;

  if (cantidadPalabras > 20) puntajeGeneral = 15;
  else if (cantidadPalabras > 10) puntajeGeneral = 10;
  else if (cantidadPalabras > 5) puntajeGeneral = 5;
  else puntajeGeneral = 0;

  return puntajeDuracion + puntajeContinuidad + puntajeGeneral;
}

function calcularCalidadVocalGeneral(
  rmsPromedio: number,
  porcentajeSilencio: number,
  porcentajeActividad: number
) {
  // Si el volumen es prácticamente nulo, la voz no existió
  if (rmsPromedio < 0.01) return 0;
  // Si hubo silencio casi total, puntaje vocal es 0
  if (porcentajeSilencio > 85) return 0;

  let puntaje = 0;

  if (rmsPromedio >= 0.05) puntaje += 10;
  else if (rmsPromedio >= 0.03) puntaje += 7;
  else if (rmsPromedio >= 0.015) puntaje += 4;
  else puntaje += 0;

  if (porcentajeActividad >= 70) puntaje += 10;
  else if (porcentajeActividad >= 50) puntaje += 7;
  else if (porcentajeActividad >= 30) puntaje += 4;
  else puntaje += 0;

  if (porcentajeSilencio <= 25) {
    puntaje += 10;
  } else if (porcentajeSilencio <= 45) {
    puntaje += 8;
  } else if (porcentajeSilencio <= 65) {
    if (porcentajeActividad >= 50) puntaje += 6;
    else puntaje += 3;
  } else {
    if (porcentajeActividad < 30) puntaje += 0;
    else puntaje += 2;
  }

  return puntaje;
}

export class EvaluacionesService {
  async evaluarPractica(data: EvaluarPracticaInput) {
    const {
      idPractica,
      transcripcion,
      duracionAudio,
      rmsPromedio,
      porcentajeSilencio,
      porcentajeActividad,
      porcentajeClipping = 0
    } = data;

    const { data: practica, error: errorPractica } = await supabase
      .from('tbl_practica')
      .select('*')
      .eq('id', idPractica)
      .single();

    if (errorPractica || !practica) {
      throw new Error('No se encontró la práctica');
    }

    const { data: cancion, error: errorCancion } = await supabase
      .from('tbl_cancion')
      .select('*')
      .eq('id', practica.id_cancion)
      .single();

    if (errorCancion || !cancion) {
      throw new Error('No se encontró la canción asociada');
    }

    const letra = cancion.letra || '';
    const transcripcionFinal = transcripcion || '';
    const duracionFinal = typeof duracionAudio === 'number' ? duracionAudio : 0;
    const duracionCancion = typeof cancion.duracion === 'number' ? cancion.duracion : 1;

    const coberturaTemporal = duracionFinal / Math.max(duracionCancion, 1);
    const similitud = calcularSimilitud(letra, transcripcionFinal);
    const cobertura = calcularCobertura(letra, transcripcionFinal);

    const cantidadPalabras = normalizarTexto(transcripcionFinal)
      .split(' ')
      .filter(Boolean).length;

    // Si no se detectó transcripción alguna, puntaje es 0
    if (!transcripcionFinal.trim() || cantidadPalabras === 0) {
      return {
        puntaje: 0,
        puntajeLetra: 0,
        puntajeAudio: 0,
        puntajeVoz: 0,
        feedback: 'No se detectó voz ni canto. ¿Seguro que cantaste?',
        transcripcion: transcripcionFinal
      };
    }

    // Si la similitud con la letra es casi nula, no merece puntos
    if (similitud < 0.10) {
      return {
        puntaje: 0,
        puntajeLetra: 0,
        puntajeAudio: 0,
        puntajeVoz: 0,
        feedback: 'No se detectó relación con la canción. Intenta seguir la letra.',
        transcripcion: transcripcionFinal
      };
    }

    let puntajeMaximo = 100;

    if (coberturaTemporal < 0.10 || cobertura < 0.10) {
      puntajeMaximo = 15;
    } else if (coberturaTemporal < 0.20 || cobertura < 0.20) {
      puntajeMaximo = 35;
    } else if (coberturaTemporal < 0.35) {
      puntajeMaximo = 55;
    } else if (coberturaTemporal < 0.50) {
      puntajeMaximo = 75;
    }

    const puntajeLetra = similitud * 35 + cobertura * 25;
    let puntajeAudioBase = calcularCalidadAudio(duracionFinal, cantidadPalabras);

    let puntajeVoz = calcularCalidadVocalGeneral(
      typeof rmsPromedio === 'number' ? rmsPromedio : 0,
      typeof porcentajeSilencio === 'number' ? porcentajeSilencio : 100,
      typeof porcentajeActividad === 'number' ? porcentajeActividad : 0
    );

    // Penalización por Gritos (Clipping)
    if (porcentajeClipping > 15) {
      puntajeAudioBase = Math.max(0, puntajeAudioBase - 15);
      puntajeVoz = Math.max(0, puntajeVoz - 10);
    }

    const puntajeAudio = puntajeAudioBase * similitud;
    const puntajeVozAjustado = puntajeVoz * similitud;

    let puntajeFinal = puntajeLetra + puntajeAudio + puntajeVozAjustado;

    if (puntajeFinal > puntajeMaximo) {
      puntajeFinal = puntajeMaximo;
    }

    if (puntajeFinal > 100) puntajeFinal = 100;
    if (puntajeFinal < 0) puntajeFinal = 0;

    const observaciones: string[] = [];

    if (coberturaTemporal < 0.10 || cobertura < 0.10) {
      observaciones.push('La interpretación fue demasiado corta en comparación con la duración de la canción');
    } else if (coberturaTemporal < 0.20 || cobertura < 0.20) {
      observaciones.push('Cantaste una parte muy pequeña de la canción; intenta cubrir un fragmento más amplio');
    } else if (coberturaTemporal < 0.35) {
      observaciones.push('La interpretación tuvo una cobertura limitada de la canción');
    } else {
      observaciones.push('La interpretación cubrió una parte razonable de la canción');
    }

    if (similitud < 0.30) {
      observaciones.push('hubo muchas diferencias con respecto a la letra original');
    } else if (similitud < 0.45) {
      observaciones.push('hubo varias imprecisiones frente a la letra original');
    } else if (similitud < 0.65) {
      observaciones.push('la letra fue reconocible, aunque con algunos errores');
    } else {
      observaciones.push('hubo buena correspondencia con la letra');
    }

    if (typeof rmsPromedio === 'number') {
      if (rmsPromedio < 0.02) {
        observaciones.push('la voz tuvo poca presencia o intensidad');
      } else if (rmsPromedio < 0.04) {
        observaciones.push('la voz tuvo una presencia moderada');
      } else {
        observaciones.push('la voz tuvo buena presencia durante la interpretación');
      }
    }

    if (
      typeof porcentajeSilencio === 'number' &&
      typeof porcentajeActividad === 'number'
    ) {
      if (porcentajeSilencio > 65 && porcentajeActividad < 35) {
        observaciones.push('se detectaron demasiadas pausas o poca continuidad vocal');
      } else if (porcentajeSilencio > 50 && porcentajeActividad < 50) {
        observaciones.push('hubo algunas pausas que afectaron la continuidad');
      } else {
        observaciones.push('la actividad vocal fue aceptable');
      }
    }

    if (porcentajeClipping > 15) {
      observaciones.push('el usuario gritó demasiado y saturó el micrófono');
    }

    // Generación de feedback dinámico con Gemini
    let feedback = '';
    try {
      const aiClient = await getAI();
      const prompt = `
Eres un juez de karaoke con una personalidad carismática, algo sarcástica pero muy amable, y con toques profesionales.
Acabas de escuchar a un participante cantar la canción "${cancion.titulo}".
Aquí tienes sus métricas (evaluadas sobre 100 en total):
- Puntaje general: ${Math.round(puntajeFinal)}/100
- Precisión de la letra: ${Math.round(puntajeLetra)} (Cantó: "${transcripcionFinal}")
- Potencia vocal y presencia: ${Math.round(puntajeVozAjustado)}
- Ritmo y audio: ${Math.round(puntajeAudio)}
- Observaciones técnicas del sistema: ${observaciones.join('. ')}.

Dale un feedback directo al usuario en 2 o 3 oraciones hablándole directamente ("Tú..."). Sé divertido, usa emojis y mantén tu personalidad. Si el puntaje es bajo, haz una crítica constructiva con algo de sarcasmo ligero; si es alto, alábalo profesionalmente.
`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      feedback = response.text || 'Buena interpretación, ¡sigue practicando!';
    } catch (e) {
      console.error('Error al generar feedback con Gemini:', e);
      feedback = 'Buena interpretación. ' + observaciones.join('. ');
    }

    const resultado = {
      puntaje: Math.round(puntajeFinal),
      puntajeLetra: Math.round(puntajeLetra),
      puntajeAudio: Math.round(puntajeAudio),
      puntajeVoz: Math.round(puntajeVozAjustado),
      feedback,
      transcripcion: transcripcionFinal
    };

    return resultado;
  }
}