// Helper per obtenir un element del DOM amb tipus i fallar aviat si no existeix.
function getById(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`No se encontró el elemento con id "${id}"`);
    }
    return element;
}
// Referències als blocs principals de la pantalla.
const menuScreen = getById("menuScreen");
const lobbyScreen = getById("lobbyScreen");
const gameScreen = getById("gameScreen");
const playerNameInput = getById("playerName");
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
/* =========================================================
   PREGUNTES DE RECANVI (si el backend no les envia)
   Si el servidor no proporciona preguntes, es fan servir aquestes.
   ========================================================= */
const FALLBACK_QUESTIONS = [
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
// Estat únic del client: cada canvi aquí es reflecteix després a la UI.
const state = {
    roomCode: "",
    playerName: "",
    playerId: "",
    playerScore: 0,
    opponentScore: 0,
    opponentLabel: "Rival",
    currentQuestion: "",
    answers: [],
    currentQuestionIndex: 0,
    locked: false,
    gameEnded: false,
    gameStarted: false
};
let ws = null;
let cooldownInterval = null;
let pendingTimeouts = [];
// Guardem els timeouts actius per poder netejar-los en sortir de la partida.
function scheduleTimeout(callback, delay) {
    const timeoutId = window.setTimeout(() => {
        pendingTimeouts = pendingTimeouts.filter((id) => id !== timeoutId);
        callback();
    }, delay);
    pendingTimeouts.push(timeoutId);
}
// Cancel·la tots els timeouts pendents.
function clearPendingTimeouts() {
    pendingTimeouts.forEach((id) => window.clearTimeout(id));
    pendingTimeouts = [];
}
// Connecta amb el servidor WebSocket real.
function connectSocket() {
    if (ws && ws.readyState === WebSocket.OPEN)
        return;
    ws = new WebSocket("ws://localhost:3000");
    ws.onopen = () => {
        console.log("Conectado al servidor real en localhost:3000");
    };
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        }
        catch (error) {
            console.error("Error al parsear mensaje del servidor:", error);
        }
    };
    ws.onclose = () => {
        console.log("Desconectado del servidor");
        ws = null;
    };
    ws.onerror = (error) => {
        console.error("Error de WebSocket:", error);
    };
}
// Envia un missatge al servidor.
function sendMessage(payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket no conectado");
        return;
    }
    ws.send(JSON.stringify(payload));
}
// Mostra només la pantalla indicada i amaga la resta.
function showScreen(screen) {
    [menuScreen, lobbyScreen, gameScreen].forEach((s) => {
        s.classList.remove("active");
    });
    screen.classList.add("active");
}
// Escriu un missatge d'error.
function setError(message) {
    menuError.textContent = message;
}
// Dibuixa els 8 quesets del marcador.
function createWedges(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < 8; i++) {
        const wedge = document.createElement("div");
        wedge.className = "wedge" + (i < count ? " filled" : "");
        wedge.textContent = i < count ? "🧀" : "";
        container.appendChild(wedge);
    }
}
// Repinta tota la interfície del joc a partir de l'estat actual.
function updateBoard() {
    createWedges(playerProgress, state.playerScore);
    createWedges(opponentProgress, state.opponentScore);
    scoreText.textContent = String(state.playerScore);
    opponentName.textContent = state.opponentLabel;
    questionText.textContent = state.currentQuestion || "Waiting for question...";
    answerButtons.forEach((btn, index) => {
        btn.textContent = state.answers[index] || `Answer ${index + 1}`;
        btn.disabled = state.locked || state.gameEnded || !state.answers[index];
    });
}
// Atura el compte enrere.
function stopCooldown() {
    if (cooldownInterval !== null) {
        window.clearInterval(cooldownInterval);
        cooldownInterval = null;
    }
    cooldownText.textContent = "";
    cooldownText.classList.add("hidden");
}
// Bloqueja temporalment les respostes quan el jugador falla.
function setCooldown(seconds) {
    stopCooldown();
    state.locked = true;
    cooldownText.classList.remove("hidden");
    cooldownText.textContent = `You answered wrong. Wait ${seconds}s to answer again.`;
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
        cooldownText.textContent = `You answered wrong. Wait ${remaining}s to answer again.`;
    }, 1000);
}
function showEndModal(title, message) {
    state.gameEnded = true;
    state.locked = true;
    stopCooldown();
    updateBoard();
    endTitle.textContent = title;
    endMessage.textContent = message;
    endModal.classList.remove("hidden");
}
// Torna tota la UI a l'estat inicial.
function resetState() {
    state.roomCode = "";
    state.playerName = "";
    state.playerId = "";
    state.playerScore = 0;
    state.opponentScore = 0;
    state.opponentLabel = "Opponent";
    state.currentQuestion = "";
    state.answers = [];
    state.currentQuestionIndex = 0;
    state.locked = false;
    state.gameEnded = false;
    state.gameStarted = false;
    roomCodeBox.textContent = "------";
    lobbyStatus.textContent = "Waiting for the other player...";
    roomCodeInput.value = "";
    playerNameInput.value = "";
    endModal.classList.add("hidden");
    clearPendingTimeouts();
    stopCooldown();
    updateBoard();
}
function goToMenu() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        sendMessage({ type: "leave_room" });
    }
    resetState();
    setError("");
    showScreen(menuScreen);
}
// Valida el nom del jugador.
function validateName() {
    const name = playerNameInput.value.trim();
    if (!name) {
        setError("You must enter your name.");
        return null;
    }
    return name;
}
// Gestiona els missatges del servidor.
function handleServerMessage(data) {
    console.log("Mensaje del servidor:", data);
    switch (data.type) {
        case "connected":
            state.playerId = data.playerId;
            console.log("Tu ID:", state.playerId);
            break;
        case "room_created":
            state.roomCode = data.code;
            roomCodeBox.textContent = data.code;
            lobbyStatus.textContent = "Waiting for the other player...";
            showScreen(lobbyScreen);
            break;
        case "room_joined":
            state.roomCode = data.code;
            roomCodeBox.textContent = data.code;
            lobbyStatus.textContent = "Joined! Waiting for the game to start...";
            showScreen(lobbyScreen);
            break;
        case "player_joined":
            lobbyStatus.textContent = "Opponent joined! Starting game soon...";
            break;
        case "game_start":
            state.gameStarted = true;
            onGameStart({
                question: data.question,
                answers: data.answers
            });
            break;
        case "new_question":
            state.locked = false;
            state.currentQuestion = data.question;
            state.answers = data.answers;
            updateBoard();
            break;
        case "answer_result":
            if (data.correct) {
                state.playerScore = data.playerScore;
                state.opponentScore = data.opponentScore;
                updateBoard();
            }
            else {
                setCooldown(5);
                state.playerScore = data.playerScore;
                state.opponentScore = data.opponentScore;
            }
            break;
        case "game_over":
            showEndModal(data.winner === "you" ? "You Won!" : "You Lost", data.message || "The game has ended.");
            break;
        case "opponent_left":
            showEndModal("Opponent Left", "Your opponent has disconnected.");
            break;
        case "error":
            setError(data.message || "An error occurred.");
            break;
        default:
            console.log("Unknown message type:", data.type);
    }
}
// Inicia la partida con preguntas del servidor
function onGameStart(payload) {
    state.opponentLabel = payload.opponentLabel || "Opponent";
    state.playerScore = payload.playerScore || 0;
    state.opponentScore = payload.opponentScore || 0;
    state.gameEnded = false;
    state.gameStarted = true;
    state.locked = false;
    state.currentQuestionIndex = 0;
    // Usar la pregunta del servidor si viene, si no usar fallback
    if (payload.question && payload.answers) {
        state.currentQuestion = payload.question;
        state.answers = payload.answers;
    }
    else {
        loadNextQuestion();
    }
    updateBoard();
    showScreen(gameScreen);
}
// Carga la siguiente pregunta (de momento, usando fallback local)
function loadNextQuestion() {
    if (state.currentQuestionIndex >= FALLBACK_QUESTIONS.length) {
        showEndModal("Game Over", `You scored ${state.playerScore} / ${FALLBACK_QUESTIONS.length}`);
        return;
    }
    const question = FALLBACK_QUESTIONS[state.currentQuestionIndex];
    state.currentQuestion = question.question;
    state.answers = question.answers;
    state.correctIndex = question.correctIndex;
    state.locked = false;
    updateBoard();
}
// Envia una resposta al servidor
function submitAnswer(answerIndex) {
    if (state.locked || state.gameEnded)
        return;
    state.locked = true;
    // Validar localmente primero antes de enviar
    if (state.gameStarted && state.answers[answerIndex]) {
        // Enviar respuesta al servidor
        sendMessage({
            type: "answer",
            answerIndex: answerIndex
        });
    }
    else {
        // Si no estamos en juego, usar lógica local de fallback
        if (answerIndex === state.correctIndex) {
            state.playerScore = Math.min(8, state.playerScore + 1);
            updateBoard();
            if (state.playerScore >= 8) {
                scheduleTimeout(() => {
                    showEndModal("You Won!", "You got 8 correct answers!");
                }, 500);
                return;
            }
            state.currentQuestionIndex += 1;
            scheduleTimeout(() => {
                loadNextQuestion();
            }, 700);
            return;
        }
        setCooldown(5);
    }
}
// EVENTOS DEL FRONTEND
createRoomBtn.addEventListener("click", () => {
    const name = validateName();
    if (!name)
        return;
    setError("");
    state.playerName = name;
    connectSocket();
    // Esperar a que el socket esté listo
    const waitForSocket = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            clearInterval(waitForSocket);
            sendMessage({
                type: "create_room"
            });
        }
    }, 100);
    scheduleTimeout(() => {
        clearInterval(waitForSocket);
    }, 5000);
});
joinRoomBtn.addEventListener("click", () => {
    const name = validateName();
    if (!name)
        return;
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) {
        setError("You must enter a room code.");
        return;
    }
    setError("");
    state.playerName = name;
    connectSocket();
    const waitForSocket = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            clearInterval(waitForSocket);
            sendMessage({
                type: "join_room",
                code: code
            });
        }
    }, 100);
    scheduleTimeout(() => {
        clearInterval(waitForSocket);
    }, 5000);
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
// Pinta l'estat inicial.
updateBoard();
window.triviaUI = {
    goToMenu
};
export {};
//# sourceMappingURL=app.js.map