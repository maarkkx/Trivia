type Winner = "you" | "opponent";

interface DemoQuestion {
  question: string;
  answers: string[];
  correctIndex: number;
}

interface GameStartPayload {
  opponentLabel?: string;
  playerScore?: number;
  opponentScore?: number;
  question?: string;
  answers?: string[];
}

interface NewQuestionPayload {
  question: string;
  answers: string[];
}

interface ScoreUpdatePayload {
  playerScore?: number;
  opponentScore?: number;
}

interface AnswerResultPayload {
  correct: boolean;
  playerScore?: number;
  cooldown?: number;
}

interface GameOverPayload {
  winner: Winner;
  message?: string;
}

interface TriviaState {
  roomCode: string;
  playerScore: number;
  opponentScore: number;
  opponentLabel: string;
  currentQuestion: string;
  answers: string[];
  currentQuestionIndex: number;
  locked: boolean;
  gameEnded: boolean;
}

function getById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`No se encontró el elemento con id "${id}"`);
  }

  return element as T;
}

const menuScreen = getById<HTMLElement>("menuScreen");
const lobbyScreen = getById<HTMLElement>("lobbyScreen");
const gameScreen = getById<HTMLElement>("gameScreen");

const roomCodeInput = getById<HTMLInputElement>("roomCodeInput");
const menuError = getById<HTMLElement>("menuError");

const createRoomBtn = getById<HTMLButtonElement>("createRoomBtn");
const joinRoomBtn = getById<HTMLButtonElement>("joinRoomBtn");
const backToMenuBtn = getById<HTMLButtonElement>("backToMenuBtn");

const roomCodeBox = getById<HTMLElement>("roomCodeBox");
const lobbyStatus = getById<HTMLElement>("lobbyStatus");

const opponentName = getById<HTMLElement>("opponentName");
const opponentProgress = getById<HTMLElement>("opponentProgress");
const playerProgress = getById<HTMLElement>("playerProgress");
const questionText = getById<HTMLElement>("questionText");
const scoreText = getById<HTMLElement>("scoreText");
const cooldownText = getById<HTMLElement>("cooldownText");

const endModal = getById<HTMLElement>("endModal");
const endTitle = getById<HTMLElement>("endTitle");
const endMessage = getById<HTMLElement>("endMessage");
const endGoMenuBtn = getById<HTMLButtonElement>("endGoMenuBtn");

const answerButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".answer-btn")
);

const DEMO_QUESTIONS: DemoQuestion[] = [
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

const state: TriviaState = {
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

let cooldownInterval: number | null = null;
let opponentInterval: number | null = null;
let pendingTimeouts: number[] = [];

function scheduleTimeout(callback: () => void, delay: number): void {
  const timeoutId = window.setTimeout(() => {
    pendingTimeouts = pendingTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  pendingTimeouts.push(timeoutId);
}

function clearPendingTimeouts(): void {
  pendingTimeouts.forEach((id) => window.clearTimeout(id));
  pendingTimeouts = [];
}

function generateRoomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

function showScreen(screen: HTMLElement): void {
  [menuScreen, lobbyScreen, gameScreen].forEach((s) => {
    s.classList.remove("active");
  });

  screen.classList.add("active");
}

function setError(message: string): void {
  menuError.textContent = message;
}

function createWedges(container: HTMLElement, count: number): void {
  container.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const wedge = document.createElement("div");
    wedge.className = "wedge" + (i < count ? " filled" : "");
    wedge.textContent = i < count ? "🧀" : "";
    container.appendChild(wedge);
  }
}

function updateBoard(): void {
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

function stopCooldown(): void {
  if (cooldownInterval !== null) {
    window.clearInterval(cooldownInterval);
    cooldownInterval = null;
  }

  cooldownText.textContent = "";
  cooldownText.classList.add("hidden");
}

function setCooldown(seconds: number): void {
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

function stopOpponentSimulation(): void {
  if (opponentInterval !== null) {
    window.clearInterval(opponentInterval);
    opponentInterval = null;
  }
}

function startOpponentSimulation(): void {
  stopOpponentSimulation();

  opponentInterval = window.setInterval(() => {
    if (state.gameEnded) return;

    const shouldAdvance = Math.random() < 0.4;
    if (!shouldAdvance) return;

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

function showEndModal(title: string, message: string): void {
  state.gameEnded = true;
  state.locked = true;
  stopOpponentSimulation();
  stopCooldown();
  updateBoard();

  endTitle.textContent = title;
  endMessage.textContent = message;
  endModal.classList.remove("hidden");
}

function resetState(): void {
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

function goToMenu(): void {
  resetState();
  setError("");
  showScreen(menuScreen);
}

function getCurrentDemoQuestion(): DemoQuestion | null {
  return DEMO_QUESTIONS[state.currentQuestionIndex] || null;
}

function loadCurrentDemoQuestion(): void {
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

function startDemoGame(): void {
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

function submitAnswer(answerIndex: number): void {
  if (state.locked || state.gameEnded) return;

  const current = getCurrentDemoQuestion();
  if (!current) return;

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

function onRoomCreated(code: string): void {
  state.roomCode = code;
  roomCodeBox.textContent = code;
  lobbyStatus.textContent = "Esperando al otro jugador...";
  showScreen(lobbyScreen);
}

function onRoomJoined(code: string): void {
  state.roomCode = code;
  roomCodeBox.textContent = code;
  lobbyStatus.textContent = `Te has unido a la sala ${code}. Esperando partida...`;
  showScreen(lobbyScreen);
}

function onPlayerJoined(playerId: string): void {
  lobbyStatus.textContent = `${playerId} se ha unido. Preparando partida...`;
}

function onGameStart(payload: GameStartPayload): void {
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

function onNewQuestion(payload: NewQuestionPayload): void {
  state.currentQuestion = payload.question;
  state.answers = payload.answers;
  state.locked = false;
  updateBoard();
}

function onScoreUpdate(payload: ScoreUpdatePayload): void {
  state.playerScore = payload.playerScore ?? state.playerScore;
  state.opponentScore = payload.opponentScore ?? state.opponentScore;
  updateBoard();
}

function onAnswerResult(payload: AnswerResultPayload): void {
  if (payload.correct) {
    state.playerScore = payload.playerScore ?? state.playerScore + 1;
    updateBoard();
    return;
  }

  setCooldown(payload.cooldown ?? 5);
}

function onOpponentUpdate(opponentScoreValue: number): void {
  state.opponentScore = opponentScoreValue;
  updateBoard();
}

function onGameOver(payload: GameOverPayload): void {
  showEndModal(
    payload.winner === "you" ? "¡Has ganado!" : "Has perdido",
    payload.message || "La partida ha terminado."
  );
}

function onServerError(message: string): void {
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

/* =========================================================
   EXPUESTO PARA QUE LUEGO TU COMPAÑERO PUEDA LLAMARLO
   ========================================================= */
export {}

declare global {
  interface Window {
    triviaUI: {
      onRoomCreated: (code: string) => void;
      onRoomJoined: (code: string) => void;
      onPlayerJoined: (playerId: string) => void;
      onGameStart: (payload: GameStartPayload) => void;
      onNewQuestion: (payload: NewQuestionPayload) => void;
      onScoreUpdate: (payload: ScoreUpdatePayload) => void;
      onAnswerResult: (payload: AnswerResultPayload) => void;
      onOpponentUpdate: (opponentScore: number) => void;
      onGameOver: (payload: GameOverPayload) => void;
      onServerError: (message: string) => void;
      goToMenu: () => void;
      startDemoGame: () => void;
    };
  }
}

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