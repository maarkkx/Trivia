import type { Question } from "../types/game.types";

//Barallar les respostes
function barajarRespuestas(array: string[]): string[] {
  const respuestas = [...array];

  for (let i = respuestas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [respuestas[i], respuestas[j]] = [respuestas[j], respuestas[i]];
  }
  return respuestas;
}

// Obtenir pregunta random de la API
export async function preguntaRandom(): Promise<Question> {
  try {
    //alvaro aqui pillo directamente una pregunta random desde la api
    const response = await fetch("https://the-trivia-api.com/v2/questions?order=rand&limit=1");
    const data = await response.json();
    const question = data[0];

    //Barallar totes ls respostes
    const allAnswers = barajarRespuestas([
      question.correctAnswer,
      ...question.incorrectAnswers
    ]);

    return {
      question: question.question.text,
      correctAnswer: question.correctAnswer,
      incorrectAnswers: question.incorrectAnswers,
      allAnswers //todas las preguntas mezcladas 
    };
  } catch {
    throw new Error("Error amb l'API de Trivia");
  }
}
