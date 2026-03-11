export interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
}

function shuffleAnswers(answers: string[]): string[] {
  const shuffled = [...answers];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled;
}

export async function getRandomQuestion(): Promise<TriviaQuestion> {
  const response = await fetch("https://the-trivia-api.com/v2/questions?limit=1");

  if (!response.ok) {
    throw new Error("No se pudo obtener una pregunta de la API");
  }

  const data = await response.json();

  const apiQuestion = data[0];

  const allAnswers = shuffleAnswers([
    apiQuestion.correctAnswer,
    ...apiQuestion.incorrectAnswers,
  ]);

  return {
    question: apiQuestion.question.text,
    correctAnswer: apiQuestion.correctAnswer,
    incorrectAnswers: apiQuestion.incorrectAnswers,
    allAnswers,
  };
}