"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomQuestion = getRandomQuestion;
// Barallar les respostes
function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
// Obtenir pregunta random de l'API
async function getRandomQuestion() {
    const response = await fetch("https://the-trivia-api.com/v2/questions?order=rand&limit=1");
    if (!response.ok) {
        throw new Error("Error amb l'API de Trivia");
    }
    const data = await response.json();
    const question = data[0];
    // Barallar totes les respostes
    const allAnswers = shuffleArray([
        question.correctAnswer,
        ...question.incorrectAnswers,
    ]);
    return {
        question: question.question.text,
        correctAnswer: question.correctAnswer,
        incorrectAnswers: question.incorrectAnswers,
        allAnswers,
    };
}
