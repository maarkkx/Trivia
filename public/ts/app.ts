type Winner = "you" | "opponent";

// Estructures de dades que descriuen la informació que mou la interfície.
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

// Helper per obtenir un element del DOM amb tipus i fallar aviat si no existeix.
function getById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`No se encontró el elemento con id "${id}"`);
  }

  return element as T;
}

// Referències als blocs principals de la pantalla.
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

/* =========================================================
   DEMO LOCAL
   Aquest banc de preguntes només existeix per poder provar el joc
   en local, sense servidor ni connexions reals.
   ========================================================= */
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

// Estat únic del client: cada canvi aquí es reflecteix després a la UI.
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

// Guardem els timeouts actius per poder netejar-los en sortir de la partida.
function scheduleTimeout(callback: () => void, delay: number): void {
  const timeoutId = window.setTimeout(() => {
    pendingTimeouts = pendingTimeouts.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  pendingTimeouts.push(timeoutId);
}

// Cancel·la tots els timeouts pendents de la simulació o de la UI.
function clearPendingTimeouts(): void {
  pendingTimeouts.forEach((id) => window.clearTimeout(id));
  pendingTimeouts = [];
}

// Genera un codi de sala fals per a les proves locals.
function generateRoomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

// Mostra només la pantalla indicada i amaga la resta.
function showScreen(screen: HTMLElement): void {
  [menuScreen, lobbyScreen, gameScreen].forEach((s) => {
    s.classList.remove("active");
  });

  screen.classList.add("active");
}

// Escriu un missatge d'error sota el formulari del menú.
function setError(message: string): void {
  menuError.textContent = message;
}

// Dibuixa els 8 quesets del marcador; els encerts es marquen com a plens.
function createWedges(container: HTMLElement, count: number): void {
  container.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const wedge = document.createElement("div");
    wedge.className = "wedge" + (i < count ? " filled" : "");
    wedge.textContent = i < count ? "🧀" : "";
    container.appendChild(wedge);
  }
}

// Repinta tota la interfície del joc a partir de l'estat actual.
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

// Atura el compte enrere si estava actiu i amaga l'avís.
function stopCooldown(): void {
  if (cooldownInterval !== null) {
    window.clearInterval(cooldownInterval);
    cooldownInterval = null;
  }

  cooldownText.textContent = "";
  cooldownText.classList.add("hidden");
}

// Bloqueja temporalment les respostes quan el jugador falla.
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

// DEMO LOCAL: en aquest mode el rival és simulat, així que aquest interval s'ha de poder tallar.
function stopOpponentSimulation(): void {
  if (opponentInterval !== null) {
    window.clearInterval(opponentInterval);
    opponentInterval = null;
  }
}

/* DEMO LOCAL:
   Aquest bloc simula un rival que, de tant en tant, encerta preguntes.
   Serveix perquè la partida sigui jugable en local sense backend. */
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

// Torna tota la UI a l'estat inicial, com quan s'obre l'app per primer cop.
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

// DEMO LOCAL: llegeix la pregunta actual del banc de proves local.
function getCurrentDemoQuestion(): DemoQuestion | null {
  return DEMO_QUESTIONS[state.currentQuestionIndex] || null;
}

// DEMO LOCAL: carrega la pregunta actual a la interfície.
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

/* DEMO LOCAL:
   Inicia una partida falsa en local. No hi ha cap servidor: tot surt
   del banc de preguntes i de les simulacions definides en aquest fitxer. */
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

// DEMO LOCAL: comprova la resposta contra la pregunta actual i avança la partida de prova.
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
  INTEGRACIÓ REAL
  Aquestes funcions estan preparades perquè més endavant el backend
  o el teu company puguin controlar la UI amb dades reals.
   ========================================================= */

// El servidor real podria cridar això quan la sala s'hagi creat correctament.
function onRoomCreated(code: string): void {
  state.roomCode = code;
  roomCodeBox.textContent = code;
  lobbyStatus.textContent = "Esperando al otro jugador...";
  showScreen(lobbyScreen);
}

// El servidor real podria cridar això quan l'usuari entri a una sala existent.
function onRoomJoined(code: string): void {
  state.roomCode = code;
  roomCodeBox.textContent = code;
  lobbyStatus.textContent = `Te has unido a la sala ${code}. Esperando partida...`;
  showScreen(lobbyScreen);
}

// Actualitza el lobby quan entra el segon jugador.
function onPlayerJoined(playerId: string): void {
  lobbyStatus.textContent = `${playerId} se ha unido. Preparando partida...`;
}

// Carrega l'estat inicial d'una partida quan el backend digui que comença.
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

// Substitueix la pregunta actual per una de nova.
function onNewQuestion(payload: NewQuestionPayload): void {
  state.currentQuestion = payload.question;
  state.answers = payload.answers;
  state.locked = false;
  updateBoard();
}

// Refresca els marcadors sense tocar la resta de l'estat.
function onScoreUpdate(payload: ScoreUpdatePayload): void {
  state.playerScore = payload.playerScore ?? state.playerScore;
  state.opponentScore = payload.opponentScore ?? state.opponentScore;
  updateBoard();
}

// Aplica el resultat d'una resposta enviada al servidor.
function onAnswerResult(payload: AnswerResultPayload): void {
  if (payload.correct) {
    state.playerScore = payload.playerScore ?? state.playerScore + 1;
    updateBoard();
    return;
  }

  setCooldown(payload.cooldown ?? 5);
}

// Actualitza només el marcador del rival.
function onOpponentUpdate(opponentScoreValue: number): void {
  state.opponentScore = opponentScoreValue;
  updateBoard();
}

// Tanca la partida i mostra el modal final.
function onGameOver(payload: GameOverPayload): void {
  showEndModal(
    payload.winner === "you" ? "¡Has ganado!" : "Has perdido",
    payload.message || "La partida ha terminado."
  );
}

// Mostra errors rebuts del servidor a la UI.
function onServerError(message: string): void {
  setError(message || "Ha ocurrido un error.");
}

/* =========================================================
   ESDEVENIMENTS DEL FRONTEND - ARA MATEIX EN MODE DEMO
   Aquí encara no parlem amb cap backend real. Fem servir simulacions
   locals perquè el joc sigui provable al navegador.
   ========================================================= */

createRoomBtn.addEventListener("click", () => {
  setError("");

  // DEMO LOCAL: generem un codi fals com si el backend hagués creat la sala.
  const code = generateRoomCode();
  onRoomCreated(code);

  // DEMO LOCAL: simulem que al cap d'un moment entra un rival.
  scheduleTimeout(() => {
    onPlayerJoined("Rival");
  }, 1200);

  // DEMO LOCAL: després arrenquem la partida sense cap validació real de servidor.
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

  // DEMO LOCAL: acceptem qualsevol codi i fem veure que la sala existeix.
  onRoomJoined(code);

  // DEMO LOCAL: inici automàtic d'una partida de prova en local.
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

// Pinta l'estat inicial abans de qualsevol interacció.
updateBoard();

/* =========================================================
  API PÚBLICA DE LA UI
  Ho exposem a window perquè després una altra capa del projecte
  pugui reutilitzar aquesta interfície sense tocar el DOM directament.
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