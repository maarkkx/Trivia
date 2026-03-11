type Winner = "you" | "opponent";

interface TriviaState {
  roomCode: string;
  playerName: string;
  playerId: string;
  playerScore: number;
  opponentScore: number;
  opponentLabel: string;
  currentQuestion: string;
  answers: string[];
  locked: boolean;
  gameEnded: boolean;
  gameStarted: boolean;
}

interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

function getById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id "${id}" not found`);
  }
  return element as T;
}

const menuScreen = getById<HTMLElement>("menuScreen");
const lobbyScreen = getById<HTMLElement>("lobbyScreen");
const gameScreen = getById<HTMLElement>("gameScreen");

const playerNameInput = getById<HTMLInputElement>("playerName");
const roomCodeInput = getById<HTMLInputElement>("roomCodeInput");
const menuError = getById<HTMLElement>("menuError");

const createRoomBtn = getById<HTMLButtonElement>("createRoomBtn");
const joinRoomBtn = getById<HTMLButtonElement>("joinRoomBtn");
const backToMenuBtn = getById<HTMLButtonElement>("backToMenuBtn");

const roomCodeBox = getById<HTMLElement>("roomCodeBox");
const lobbyStatus = getById<HTMLElement>("lobbyStatus");

const opponentTitle = getById<HTMLElement>("opponentTitle");
const opponentName = getById<HTMLElement>("opponentName");
const opponentProgress = getById<HTMLElement>("opponentProgress");
const playerProgress = getById<HTMLElement>("playerProgress");
const playerBoardTitle = getById<HTMLElement>("playerBoardTitle");
const questionText = getById<HTMLElement>("questionText");
const scoreText = getById<HTMLElement>("scoreText");
const cooldownText = getById<HTMLElement>("cooldownText");

const endModal = getById<HTMLElement>("endModal");
const endTitle = getById<HTMLElement>("endTitle");
const endMessage = getById<HTMLElement>("endMessage");
const endGoMenuBtn = getById<HTMLButtonElement>("endGoMenuBtn");

const answerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".answer-btn"));

// Estat unic del client; tota la UI surt d'aquesta estructura.
const state: TriviaState = {
  roomCode: "",
  playerName: "",
  playerId: "",
  playerScore: 0,
  opponentScore: 0,
  opponentLabel: "",
  currentQuestion: "",
  answers: [],
  locked: false,
  gameEnded: false,
  gameStarted: false,
};

let ws: WebSocket | null = null;

function connectSocket(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  ws = new WebSocket("ws://localhost:3000");

  ws.onmessage = (event: MessageEvent<string>) => {
    try {
      const data = JSON.parse(event.data) as ServerMessage;
      handleServerMessage(data);
    } catch (error) {
      console.error("Error parsing server message:", error);
    }
  };

  ws.onclose = () => {
    ws = null;
  };

  ws.onerror = () => {
    setError("Could not connect to the server.");
  };
}

function sendMessage(payload: unknown): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setError("Connection is not ready.");
    return;
  }

  ws.send(JSON.stringify(payload));
}

// Esperem el socket obert abans d'enviar create/join.
function sendWhenSocketReady(payload: unknown): void {
  connectSocket();

  const startedAt = Date.now();
  const checkInterval = window.setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      window.clearInterval(checkInterval);
      sendMessage(payload);
      return;
    }

    if (Date.now() - startedAt > 5000) {
      window.clearInterval(checkInterval);
      setError("Could not connect to the server.");
    }
  }, 100);
}

function showScreen(screen: HTMLElement): void {
  [menuScreen, lobbyScreen, gameScreen].forEach((currentScreen) => {
    currentScreen.classList.remove("active");
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
    wedge.className = `wedge${i < count ? " filled" : ""}`;
    wedge.textContent = i < count ? "*" : "";
    container.appendChild(wedge);
  }
}

function updateBoard(): void {
  createWedges(playerProgress, state.playerScore);
  createWedges(opponentProgress, state.opponentScore);

  playerBoardTitle.textContent = state.playerName || "Your board";
  opponentTitle.textContent = state.opponentLabel || "Waiting for rival...";
  opponentName.textContent = state.opponentLabel ? "Connected" : "Waiting...";
  scoreText.textContent = String(state.playerScore);
  questionText.textContent = state.currentQuestion || "Waiting for question...";

  answerButtons.forEach((button, index) => {
    const answer = state.answers[index];
    button.textContent = answer || `Answer ${index + 1}`;
    button.disabled = state.locked || state.gameEnded || !answer;
  });
}

function showEndModal(title: string, message: string): void {
  state.gameEnded = true;
  state.locked = true;
  updateBoard();

  endTitle.textContent = title;
  endMessage.textContent = message;
  endModal.classList.remove("hidden");
}

function resetState(): void {
  state.roomCode = "";
  state.playerName = "";
  state.playerId = "";
  state.playerScore = 0;
  state.opponentScore = 0;
  state.opponentLabel = "";
  state.currentQuestion = "";
  state.answers = [];
  state.locked = false;
  state.gameEnded = false;
  state.gameStarted = false;

  roomCodeBox.textContent = "------";
  lobbyStatus.textContent = "Waiting for the other player...";
  roomCodeInput.value = "";
  playerNameInput.value = "";
  cooldownText.textContent = "";
  cooldownText.classList.add("hidden");
  endModal.classList.add("hidden");

  updateBoard();
}

function goToMenu(): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage({ type: "leave_room" });
  }

  resetState();
  setError("");
  showScreen(menuScreen);
}

function validateName(): string | null {
  const name = playerNameInput.value.trim();
  if (!name) {
    setError("You must enter your name.");
    return null;
  }
  return name;
}

function onGameStart(data: ServerMessage): void {
  const question = typeof data.question === "string" ? data.question : "";
  const answers = Array.isArray(data.answers) ? (data.answers as string[]) : [];
  const playerName = typeof data.playerName === "string" ? data.playerName : state.playerName;
  const opponentNameValue = typeof data.opponentName === "string" ? data.opponentName : state.opponentLabel;

  state.gameStarted = true;
  state.gameEnded = false;
  state.locked = false;
  state.playerName = playerName;
  state.opponentLabel = opponentNameValue;
  state.currentQuestion = question;
  state.answers = answers;
  state.playerScore = 0;
  state.opponentScore = 0;

  updateBoard();
  showScreen(gameScreen);
}

// Els missatges del servidor son la font de veritat del joc online.
function handleServerMessage(data: ServerMessage): void {
  switch (data.type) {
    case "connected": {
      state.playerId = typeof data.playerId === "string" ? data.playerId : "";
      break;
    }

    case "room_created": {
      state.roomCode = typeof data.code === "string" ? data.code : "";
      state.playerName = typeof data.playerName === "string" ? data.playerName : state.playerName;
      roomCodeBox.textContent = state.roomCode || "------";
      lobbyStatus.textContent = "Waiting for the other player...";
      showScreen(lobbyScreen);
      break;
    }

    case "room_joined": {
      state.roomCode = typeof data.code === "string" ? data.code : "";
      state.playerName = typeof data.playerName === "string" ? data.playerName : state.playerName;
      roomCodeBox.textContent = state.roomCode || "------";
      lobbyStatus.textContent = "Joined! Waiting for the game to start...";
      showScreen(lobbyScreen);
      break;
    }

    case "player_joined": {
      state.opponentLabel = typeof data.playerName === "string" ? data.playerName : state.opponentLabel;
      lobbyStatus.textContent = "Opponent joined! Starting game soon...";
      break;
    }

    case "game_start": {
      onGameStart(data);
      break;
    }

    case "new_question": {
      state.locked = false;
      state.currentQuestion = typeof data.question === "string" ? data.question : "";
      state.answers = Array.isArray(data.answers) ? (data.answers as string[]) : [];
      cooldownText.textContent = "";
      cooldownText.classList.add("hidden");
      updateBoard();
      break;
    }

    case "answer_result": {
      state.playerScore = typeof data.playerScore === "number" ? data.playerScore : state.playerScore;
      state.opponentScore = typeof data.opponentScore === "number" ? data.opponentScore : state.opponentScore;

      if (data.correct === false) {
        const seconds = typeof data.cooldown === "number" ? data.cooldown : 5;
        cooldownText.textContent = `Wrong answer. Next question in ${seconds}s.`;
        cooldownText.classList.remove("hidden");
      }

      updateBoard();
      break;
    }

    case "score_update": {
      state.playerScore = typeof data.playerScore === "number" ? data.playerScore : state.playerScore;
      state.opponentScore = typeof data.opponentScore === "number" ? data.opponentScore : state.opponentScore;
      updateBoard();
      break;
    }

    case "game_over": {
      const winner = data.winner as Winner | undefined;
      const title = winner === "you" ? "You Won!" : "You Lost";
      const message = typeof data.message === "string" ? data.message : "The game has ended.";
      showEndModal(title, message);
      break;
    }

    case "opponent_left": {
      showEndModal("Opponent Left", "Your opponent has disconnected.");
      break;
    }

    case "error": {
      setError(typeof data.message === "string" ? data.message : "An error occurred.");
      break;
    }

    default:
      break;
  }
}

function submitAnswer(answerIndex: number): void {
  if (state.locked || state.gameEnded || !state.gameStarted) {
    return;
  }

  if (!state.answers[answerIndex]) {
    return;
  }

  state.locked = true;
  updateBoard();

  sendMessage({
    type: "answer",
    answerIndex,
  });
}

createRoomBtn.addEventListener("click", () => {
  const name = validateName();
  if (!name) {
    return;
  }

  setError("");
  state.playerName = name;

  sendWhenSocketReady({
    type: "create_room",
    name,
  });
});

joinRoomBtn.addEventListener("click", () => {
  const name = validateName();
  if (!name) {
    return;
  }

  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    setError("You must enter a room code.");
    return;
  }

  setError("");
  state.playerName = name;

  sendWhenSocketReady({
    type: "join_room",
    code,
    name,
  });
});

answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const answerIndex = Number(button.dataset.index);
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

export {};

declare global {
  interface Window {
    triviaUI: {
      goToMenu: () => void;
    };
  }
}

window.triviaUI = {
  goToMenu,
};
