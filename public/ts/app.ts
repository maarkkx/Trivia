// Elements del DOM
const menuScreen = document.getElementById("menuScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
const roomCodeInput = document.getElementById("roomCodeInput") as HTMLInputElement;
const menuError = document.getElementById("menuError");

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");

const roomCodeBox = document.getElementById("roomCodeBox");
const lobbyStatus = document.getElementById("lobbyStatus");

const opponentTitle = document.getElementById("opponentTitle");
const opponentName = document.getElementById("opponentName");
const opponentProgress = document.getElementById("opponentProgress");
const playerProgress = document.getElementById("playerProgress");
const playerBoardTitle = document.getElementById("playerBoardTitle");
const questionText = document.getElementById("questionText");
const scoreText = document.getElementById("scoreText");

const endModal = document.getElementById("endModal");
const endTitle = document.getElementById("endTitle");
const endMessage = document.getElementById("endMessage");
const endGoMenuBtn = document.getElementById("endGoMenuBtn");

const answerButtons = Array.from(document.querySelectorAll(".answer-btn")) as HTMLButtonElement[];

// Estat del joc
let state = {
  roomCode: "",
  playerName: "",
  playerId: "",
  playerScore: 0,
  opponentScore: 0,
  opponentName: "",
  currentQuestion: "",
  answers: [] as string[],
  locked: false,
  gameEnded: false,
};

let ws: WebSocket | null = null;

// Connectar amb el servidor
function connectSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };

  ws.onclose = () => {
    ws = null;
  };
}

// Enviar missatge al servidor
function sendMessage(message: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    menuError!.textContent = "No connectat al servidor";
    return;
  }
  ws.send(JSON.stringify(message));
}

// Processar missatges del servidor
function handleMessage(data: any) {
  switch (data.type) {
    case "connected":
      state.playerId = data.playerId;
      break;

    case "room_created":
      state.roomCode = data.code;
      state.playerName = data.playerName;
      roomCodeBox!.textContent = data.code;
      lobbyStatus!.textContent = "Esperant oponent...";
      showScreen(lobbyScreen);
      break;

    case "room_joined":
      state.roomCode = data.code;
      state.playerName = data.playerName;
      roomCodeBox!.textContent = data.code;
      lobbyStatus!.textContent = "Afegit! Esperant que comenci...";
      showScreen(lobbyScreen);
      break;

    case "player_joined":
      state.opponentName = data.playerName;
      lobbyStatus!.textContent = "L'oponent s'ha connectat! Comença en breus...";
      break;

    case "game_start":
      state.playerName = data.playerName;
      state.opponentName = data.opponentName;
      state.currentQuestion = data.question;
      state.answers = data.answers;
      state.playerScore = 0;
      state.opponentScore = 0;
      state.locked = false;
      updateBoard();
      showScreen(gameScreen);
      break;

    case "new_question":
      state.locked = false;
      state.currentQuestion = data.question;
      state.answers = data.answers;
      updateBoard();
      break;

    case "answer_result":
      state.playerScore = data.playerScore;
      state.opponentScore = data.opponentScore;
      updateBoard();
      break;

    case "score_update":
      state.playerScore = data.playerScore;
      state.opponentScore = data.opponentScore;
      updateBoard();
      break;

    case "game_over":
      endTitle!.textContent = data.winner === "you" ? "Has guanyat!" : "Has perdut";
      endMessage!.textContent = `Score: ${data.hostScore} - ${data.guestScore}`;
      endModal!.classList.remove("hidden");
      state.gameEnded = true;
      break;

    case "opponent_left":
      endTitle!.textContent = "L'oponent se n'ha anat";
      endMessage!.textContent = "La partida ha acabat";
      endModal!.classList.remove("hidden");
      state.gameEnded = true;
      break;
  }
}

// Mostrar pantalla
function showScreen(screen: HTMLElement | null) {
  [menuScreen, lobbyScreen, gameScreen].forEach((s) => {
    s?.classList.remove("active");
  });
  screen?.classList.add("active");
}

// Actualitzar taula de joc
function updateBoard() {
  // Mostrar puntuació (estreles)
  playerProgress!.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const wedge = document.createElement("div");
    wedge.className = "wedge" + (i < state.playerScore ? " filled" : "");
    wedge.textContent = "*";
    playerProgress!.appendChild(wedge);
  }

  opponentProgress!.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const wedge = document.createElement("div");
    wedge.className = "wedge" + (i < state.opponentScore ? " filled" : "");
    wedge.textContent = "*";
    opponentProgress!.appendChild(wedge);
  }

  playerBoardTitle!.textContent = state.playerName || "Tu";
  opponentTitle!.textContent = state.opponentName || "Esperant...";
  opponentName!.textContent = state.opponentName ? "Connectat" : "Esperant...";
  scoreText!.textContent = String(state.playerScore);
  questionText!.textContent = state.currentQuestion || "Esperant pregunta...";

  answerButtons.forEach((btn, i) => {
    btn.textContent = state.answers[i] || `Resposta ${i + 1}`;
    btn.disabled = state.locked || state.gameEnded || !state.answers[i];
  });
}

// Respondre pregunta
function submitAnswer(index: number) {
  if (state.locked || state.gameEnded) return;

  state.locked = true;
  updateBoard();

  sendMessage({
    type: "answer",
    answerIndex: index,
  });
}

// Botons
createRoomBtn?.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) {
    menuError!.textContent = "Has d'escriure un nom";
    return;
  }

  menuError!.textContent = "";
  connectSocket();

  setTimeout(() => {
    sendMessage({ type: "create_room", name });
  }, 500);
});

joinRoomBtn?.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  const code = roomCodeInput.value.trim().toUpperCase();

  if (!name || !code) {
    menuError!.textContent = "Has d'escriure nom i codi";
    return;
  }

  menuError!.textContent = "";
  connectSocket();

  setTimeout(() => {
    sendMessage({ type: "join_room", code, name });
  }, 500);
});

answerButtons.forEach((btn, i) => {
  btn.addEventListener("click", () => submitAnswer(i));
});

backToMenuBtn?.addEventListener("click", () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage({ type: "leave_room" });
  }
  state = {
    roomCode: "",
    playerName: "",
    playerId: "",
    playerScore: 0,
    opponentScore: 0,
    opponentName: "",
    currentQuestion: "",
    answers: [],
    locked: false,
    gameEnded: false,
  };
  menuError!.textContent = "";
  endModal!.classList.add("hidden");
  updateBoard();
  showScreen(menuScreen);
});

endGoMenuBtn?.addEventListener("click", () => {
  backToMenuBtn?.click();
});

updateBoard();

export {};
