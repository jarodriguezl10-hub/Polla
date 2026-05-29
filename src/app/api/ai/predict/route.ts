import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text.trim();
}

export async function POST(request: Request) {
  try {
    const { matchId, forceRefresh } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: "matchId es obligatorio" }, { status: 400 });
    }

    // Fetch match details
    const { data: matchArray, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId);

    if (matchError || !matchArray || matchArray.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    const match = matchArray[0];

    // ✅ CACHE: If prediction already exists and no force refresh, return cached
    if (match.ai_prediction && !forceRefresh) {
      return NextResponse.json({
        success: true,
        recommendation: match.ai_prediction,
        isRealAPI: true,
        cached: true
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let recommendation = "";
    let isRealAPI = false;
    let cached = false;

    if (apiKey) {
      try {
        const prompt = `Eres un experto comentarista y analista táctico de fútbol para el Mundial de la FIFA 2026. 
Analiza a nivel profesional el partido: ${match.team_a} vs ${match.team_b}. 
Propón una predicción de marcador exacto muy realista y una breve justificación táctica de máximo 3 líneas en español.
Tu respuesta debe iniciar con la predicción exacta en el formato exacto: "Predicción: X - Y. " seguido del análisis táctico (hablando de las fortalezas defensivas, transiciones de ataque y jugadores clave de ambas selecciones).`;

        const text = await callGeminiAPI(apiKey, prompt);
        recommendation = text;
        isRealAPI = true;

        // 💾 Save to cache in DB
        await supabase
          .from('matches')
          .update({ ai_prediction: recommendation })
          .eq('id', matchId);

      } catch (geminiError) {
        console.error("Gemini API call failed, falling back to mock:", geminiError);
        const mock = getMockAIPrediction(match.team_a, match.team_b);
        recommendation = mock.text + " ⚠️ (Análisis Simulado - Cuota de API agotada)";
      }
    } else {
      const mock = getMockAIPrediction(match.team_a, match.team_b);
      recommendation = mock.text + " (Análisis Simulado)";
    }

    return NextResponse.json({
      success: true,
      recommendation,
      isRealAPI,
      cached
    });
  } catch (error) {
    console.error("Error in AI prediction route:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Fallback mock predictions
function getMockAIPrediction(teamA: string, teamB: string) {
  const predictions: Record<string, { text: string }> = {
    "México-Sudáfrica": {
      text: "Predicción: 2 - 1. México se potencia enormemente en el Estadio Azteca. Sudáfrica intentará contragolpes veloces, pero el empuje tricolor y la posesión de balón darán el triunfo a la azul y oro."
    },
    "Brasil-Marruecos": {
      text: "Predicción: 3 - 1. El poderío ofensivo de la verdeamarela abrirá la sólida defensa marroquí. Aunque Marruecos plantará batalla, el ritmo impuesto por los extremos brasileños sellará un claro 3-1."
    },
    "España-Uruguay": {
      text: "Predicción: 2 - 2. Duelo de titanes. La posesión española contra la intensidad vertical y física de la celeste. Partido vibrante, de ida y vuelta, que culminará en empate a 2."
    },
    "Argentina-Francia": {
      text: "Predicción: 2 - 1. Revancha mundialista. La cohesión colectiva albiceleste anulará la velocidad de Mbappé. Un gol agónico de tiro libre decidirá el cotejo."
    }
  };

  const key = `${teamA}-${teamB}`;
  const keyReverse = `${teamB}-${teamA}`;
  if (predictions[key]) return predictions[key];
  if (predictions[keyReverse]) return predictions[keyReverse];

  const tacticalStyles = [
    "jugará con formación 4-3-3 presionando alto la salida rival",
    "se replegará en bloque 4-4-2 apostando por contragolpes verticales",
    "apostará por posesión y control con un 4-2-3-1 filtrando pases entre líneas",
    "impondrá juego directo y físico aprovechando las jugadas a balón parado"
  ];

  const styleIdxA = Math.abs(teamA.charCodeAt(0) + teamA.length) % tacticalStyles.length;
  const styleIdxB = Math.abs(teamB.charCodeAt(0) + teamB.length) % tacticalStyles.length;
  const styleA = tacticalStyles[styleIdxA];
  const styleB = tacticalStyles[styleIdxB === styleIdxA ? (styleIdxB + 1) % tacticalStyles.length : styleIdxB];
  const scoreA = Math.abs(teamA.charCodeAt(0) + teamA.length) % 4;
  const scoreB = Math.abs(teamB.charCodeAt(0) + teamB.length) % 3;

  return {
    text: `Predicción: ${scoreA} - ${scoreB}. Duelo estratégico de alta tensión. ${teamA} ${styleA}, mientras que ${teamB} ${styleB}. Los detalles a balón parado y la explosividad de los extremos marcarán la diferencia.`
  };
}
