"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomQuestion = getRandomQuestion;
function shuffleAnswers(answers) {
    const shuffled = [...answers];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }
    return shuffled;
}
async function getRandomQuestion() {
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
