function getById(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`No se encontró el elemento con id "${id}"`);
    }
    return element;
}
const menuScreen = getById("menuScreen");
const lobbyScreen = getById("lobbyScreen");
const gameScreen = getById("gameScreen");
const roomCodeInput = getById("roomCodeInput");
const menuError = getById("menuError");
const createRoomBtn = getById("createRoomBtn");
const joinRoomBtn = getById("joinRoomBtn");
const backToMenuBtn = getById("backToMenuBtn");
const roomCodeBox = getById("roomCodeBox");
const lobbyStatus = getById("lobbyStatus");
const opponentName = getById("opponentName");
const opponentProgress = getById("opponentProgress");
const playerProgress = getById("playerProgress");
const questionText = getById("questionText");
const scoreText = getById("scoreText");
const cooldownText = getById("cooldownText");
const endModal = getById("endModal");
const endTitle = getById("endTitle");
const endMessage = getById("endMessage");
const endGoMenuBtn = getById("endGoMenuBtn");
const answerButtons = Array.from(document.querySelectorAll(".answer-btn"));
const DEMO_QUESTIONS = [
    {
        question: "¿Cuál es la capital de Italia?",
        answers: ["Roma", "Milán", "Nápoles", "Turín"],
        correctIndex: 0
    },
    {
        question: "¿Cuánto es 7 x 8?",
        answers: ["54", "56", "64", "58"],
        correctIndex: 1
    },
    {
        question: "¿Qué planeta es conocido como el planeta rojo?",
        answers: ["Venus", "Júpiter", "Marte", "Saturno"],
        correctIndex: 2
    },
    {
        question: "¿Quién pintó la Mona Lisa?",
        answers: ["Picasso", "Da Vinci", "Velázquez", "Goya"],
        correctIndex: 1
    },
    {
        question: "¿Cuál es el océano más grande del mundo?",
        answers: ["Atlántico", "Índico", "Ártico", "Pacífico"],
        correctIndex: 3
    },
    {
        question: "¿En qué país está Tokio?",
        answers: ["China", "Corea del Sur", "Japón", "Tailandia"],
        correctIndex: 2
    },
    {
        question: "¿Cuál es el lenguaje que se ejecuta en el navegador?",
        answers: ["TypeScript", "Java", "C#", "JavaScript"],
        correctIndex: 3
    },
    {
        question: "¿Cuántos lados tiene un hexágono?",
        answers: ["5", "6", "7", "8"],
        correctIndex: 1
    }
];
const state = {
    roomCode: "",
    playerScore: 0,
    opponentScore: 0,
    opponentLabel: "Rival",
    currentQuestion: "",
    answers: [],
    currentQuestionIndex: 0,
    locked: false,
    gameEnded: false
};
let cooldownInterval = null;
let opponentInterval = null;
let pendingTimeouts = [];
function scheduleTimeout(callback, delay) {
    const timeoutId = window.setTimeout(() => {
        pendingTimeouts = pendingTimeouts.filter((id) => id !== timeoutId);
        callback();
    }, delay);
    pendingTimeouts.push(timeoutId);
}
function clearPendingTimeouts() {
    pendingTimeouts.forEach((id) => window.clearTimeout(id));
    pendingTimeouts = [];
}
function generateRoomCode(length = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
function showScreen(screen) {
    [menuScreen, lobbyScreen, gameScreen].forEach((s) => {
        s.classList.remove("active");
    });
    screen.classList.add("active");
}
function setError(message) {
    menuError.textContent = message;
}
function createWedges(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < 8; i++) {
        const wedge = document.createElement("div");
        wedge.className = "wedge" + (i < count ? " filled" : "");
        wedge.textContent = i < count ? "🧀" : "";
        container.appendChild(wedge);
    }
}
function updateBoard() {
    createWedges(playerProgress, state.playerScore);
    createWedges(opponentProgress, state.opponentScore);
    scoreText.textContent = String(state.playerScore);
    opponentName.textContent = state.opponentLabel;
    questionText.textContent = state.currentQuestion || "Esperando pregunta...";
    answerButtons.forEach((btn, index) => {
        btn.textContent = state.answers[index] || `Respuesta ${index + 1}`;
        btn.disabled = state.locked || state.gameEnded || !state.answers[index];
    });
}
function stopCooldown() {
    if (cooldownInterval !== null) {
        window.clearInterval(cooldownInterval);
        cooldownInterval = null;
    }
    cooldownText.textContent = "";
    cooldownText.classList.add("hidden");
}
function setCooldown(seconds) {
    stopCooldown();
    state.locked = true;
    cooldownText.classList.remove("hidden");
    cooldownText.textContent = `Has fallado. Espera ${seconds}s para responder otra vez.`;
    updateBoard();
    let remaining = seconds;
    cooldownInterval = window.setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            stopCooldown();
            state.locked = false;
            updateBoard();
            return;
        }
        cooldownText.textContent = `Has fallado. Espera ${remaining}s para responder otra vez.`;
    }, 1000);
}
function stopOpponentSimulation() {
    if (opponentInterval !== null) {
        window.clearInterval(opponentInterval);
        opponentInterval = null;
    }
}
function startOpponentSimulation() {
    stopOpponentSimulation();
    opponentInterval = window.setInterval(() => {
        if (state.gameEnded)
            return;
        const shouldAdvance = Math.random() < 0.4;
        if (!shouldAdvance)
            return;
        state.opponentScore = Math.min(8, state.opponentScore + 1);
        updateBoard();
        if (state.opponentScore >= 8) {
            onGameOver({
                winner: "opponent",
                message: "El rival ha conseguido los 8 quesitos antes que tú."
            });
        }
    }, 4500);
}
function showEndModal(title, message) {
    state.gameEnded = true;
    state.locked = true;
    stopOpponentSimulation();
    stopCooldown();
    updateBoard();
    endTitle.textContent = title;
    endMessage.textContent = message;
    endModal.classList.remove("hidden");
}
function resetState() {
    state.roomCode = "";
    state.playerScore = 0;
    state.opponentScore = 0;
    state.opponentLabel = "Rival";
    state.currentQuestion = "";
    state.answers = [];
    state.currentQuestionIndex = 0;
    state.locked = false;
    state.gameEnded = false;
    roomCodeBox.textContent = "------";
    lobbyStatus.textContent = "Esperando al otro jugador...";
    roomCodeInput.value = "";
    endModal.classList.add("hidden");
    clearPendingTimeouts();
    stopOpponentSimulation();
    stopCooldown();
    updateBoard();
}
function goToMenu() {
    resetState();
    setError("");
    showScreen(menuScreen);
}
function getCurrentDemoQuestion() {
    return DEMO_QUESTIONS[state.currentQuestionIndex] || null;
}
function loadCurrentDemoQuestion() {
    const current = getCurrentDemoQuestion();
    if (!current) {
        onGameOver({
            winner: "you",
            message: "Has respondido todas las preguntas de la demo."
        });
        return;
    }
    state.currentQuestion = current.question;
    state.answers = [...current.answers];
    updateBoard();
}
function startDemoGame() {
    state.playerScore = 0;
    state.opponentScore = 0;
    state.currentQuestionIndex = 0;
    state.gameEnded = false;
    state.locked = false;
    state.opponentLabel = "Rival";
    loadCurrentDemoQuestion();
    showScreen(gameScreen);
    startOpponentSimulation();
}
function submitAnswer(answerIndex) {
    if (state.locked || state.gameEnded)
        return;
    const current = getCurrentDemoQuestion();
    if (!current)
        return;
    if (answerIndex === current.correctIndex) {
        state.locked = true;
        state.playerScore = Math.min(8, state.playerScore + 1);
        updateBoard();
        if (state.playerScore >= 8) {
            scheduleTimeout(() => {
                onGameOver({
                    winner: "you",
                    message: "Has conseguido los 8 quesitos."
                });
            }, 500);
            return;
        }
        state.currentQuestionIndex += 1;
        scheduleTimeout(() => {
            state.locked = false;
            loadCurrentDemoQuestion();
        }, 700);
        return;
    }
    setCooldown(5);
}
/* =========================================================
   MÉTODOS PREPARADOS PARA LA INTEGRACIÓN REAL MÁS ADELANTE
   ========================================================= */
function onRoomCreated(code) {
    state.roomCode = code;
    roomCodeBox.textContent = code;
    lobbyStatus.textContent = "Esperando al otro jugador...";
    showScreen(lobbyScreen);
}
function onRoomJoined(code) {
    state.roomCode = code;
    roomCodeBox.textContent = code;
    lobbyStatus.textContent = `Te has unido a la sala ${code}. Esperando partida...`;
    showScreen(lobbyScreen);
}
function onPlayerJoined(playerId) {
    lobbyStatus.textContent = `${playerId} se ha unido. Preparando partida...`;
}
function onGameStart(payload) {
    state.opponentLabel = payload.opponentLabel || "Rival";
    state.playerScore = payload.playerScore || 0;
    state.opponentScore = payload.opponentScore || 0;
    state.currentQuestion = payload.question || "";
    state.answers = payload.answers || [];
    state.gameEnded = false;
    state.locked = false;
    updateBoard();
    showScreen(gameScreen);
}
function onNewQuestion(payload) {
    state.currentQuestion = payload.question;
    state.answers = payload.answers;
    state.locked = false;
    updateBoard();
}
function onScoreUpdate(payload) {
    state.playerScore = payload.playerScore ?? state.playerScore;
    state.opponentScore = payload.opponentScore ?? state.opponentScore;
    updateBoard();
}
function onAnswerResult(payload) {
    if (payload.correct) {
        state.playerScore = payload.playerScore ?? state.playerScore + 1;
        updateBoard();
        return;
    }
    setCooldown(payload.cooldown ?? 5);
}
function onOpponentUpdate(opponentScoreValue) {
    state.opponentScore = opponentScoreValue;
    updateBoard();
}
function onGameOver(payload) {
    showEndModal(payload.winner === "you" ? "¡Has ganado!" : "Has perdido", payload.message || "La partida ha terminado.");
}
function onServerError(message) {
    setError(message || "Ha ocurrido un error.");
}
/* =========================================================
   EVENTOS DEL FRONTEND - AHORA MISMO EN MODO DEMO
   ========================================================= */
createRoomBtn.addEventListener("click", () => {
    setError("");
    const code = generateRoomCode();
    onRoomCreated(code);
    scheduleTimeout(() => {
        onPlayerJoined("Rival");
    }, 1200);
    scheduleTimeout(() => {
        startDemoGame();
    }, 2200);
});
joinRoomBtn.addEventListener("click", () => {
    setError("");
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) {
        setError("Tienes que escribir un código para unirte.");
        return;
    }
    onRoomJoined(code);
    scheduleTimeout(() => {
        startDemoGame();
    }, 1400);
});
answerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const answerIndex = Number(btn.dataset.index);
        submitAnswer(answerIndex);
    });
});
backToMenuBtn.addEventListener("click", () => {
    goToMenu();
});
endGoMenuBtn.addEventListener("click", () => {
    goToMenu();
});
updateBoard();
window.triviaUI = {
    onRoomCreated,
    onRoomJoined,
    onPlayerJoined,
    onGameStart,
    onNewQuestion,
    onScoreUpdate,
    onAnswerResult,
    onOpponentUpdate,
    onGameOver,
    onServerError,
    goToMenu,
    startDemoGame
};
export {};
//# sourceMappingURL=app.js.map