import { WebSocket, WebSocketServer } from "ws";
import { createRoom, getRoomByCode, joinRoom, getOpponent, eliminarPlayerRoom } from "../game/roomManager";
import { preguntaRandom } from "../services/triviaApi.service";
import type { Player, Room } from "../types/game.types";

// Enviar missatge a un client
function sendMessage(socket: WebSocket, message: any): void {
  socket.send(JSON.stringify(message));
}

// Iniciar el joc: carrega les primeres preguntes
async function startGame(room: Room): Promise<void> {
  try {
    const q1 = await preguntaRandom();
    const q2 = await preguntaRandom();

    //Marcar les preguntes correctes dins de la room
    room.hostCorrectIndex = q1.allAnswers.indexOf(q1.correctAnswer);
    room.guestCorrectIndex = q2.allAnswers.indexOf(q2.correctAnswer); 
    room.status = "playing";
    room.questionsAsked = 1;

    sendMessage(room.host.socket, {
      type: "game_start",
      question: q1.question,
      answers: q1.allAnswers,
      playerName: room.host.name,
      opponentName: room.guest?.name || "Opponent",
    });

    if (room.guest) {
      sendMessage(room.guest.socket, {
        type: "game_start",
        question: q2.question,
        answers: q2.allAnswers,
        playerName: room.guest.name,
        opponentName: room.host.name,
      });
    }
  } catch (error) {
    console.log("Error carregant preguntes:", error);
  }
}

// Carrega la próxima pregunta o finalitza el joc
async function nextQuestion(room: Room): Promise<void> {
  if (!room.guest) return;

  // Si algun jugador arriba a 8 punts, s'acaba el joc
  if (room.host.score >= 8 || room.guest.score >= 8) {
    const hostWon = room.host.score > room.guest.score;
    
    sendMessage(room.host.socket, {
      type: "game_over",
      winner: hostWon ? "you" : "opponent",
      hostScore: room.host.score,
      guestScore: room.guest.score,
    });

    sendMessage(room.guest.socket, {
      type: "game_over",
      winner: !hostWon ? "you" : "opponent",
      hostScore: room.host.score,
      guestScore: room.guest.score,
    });

    room.status = "finished";
    eliminarPlayerRoom(room.host.id);
    return;
  }

  try {
    const q1 = await preguntaRandom();
    const q2 = await preguntaRandom();

    room.hostCorrectIndex = q1.allAnswers.indexOf(q1.correctAnswer);
    room.guestCorrectIndex = q2.allAnswers.indexOf(q2.correctAnswer);
    room.host.answered = false;
    room.guest.answered = false;
    room.questionsAsked += 1;

    sendMessage(room.host.socket, {
      type: "new_question",
      question: q1.question,
      answers: q1.allAnswers,
    });

    sendMessage(room.guest.socket, {
      type: "new_question",
      question: q2.question,
      answers: q2.allAnswers,
    });
  } catch (error) {
    console.log("Error carregant pregunta:", error);
  }
}



export function registerSocketHandlers(wss: WebSocketServer): void {
  wss.on("connection", (socket: WebSocket) => {
    //Creacip del player quan es conecta un client
    const player: Player = {
      id: Math.random().toString(36).substr(2, 9),
      socket,
      roomCode: null,
      name: "",
      score: 0,
      answered: false,
    };

    console.log(`Jugador connectat: ${player.id}`);

    sendMessage(socket, {
      type: "connected",
      playerId: player.id,
    });

    socket.on("message", async (data) => {
      let message; //missatge amb el nomd'usuari
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (message.type === "create_room") {
        player.name = message.name || "Player " + player.id.slice(0, 4);
        const room = createRoom(player);

        sendMessage(socket, {
          type: "room_created",
          code: room.code,
          playerName: player.name,
        });

        console.log(`Sala creada: ${room.code}`);
      }

      // Unir-se a sala
      if (message.type === "join_room") {
        player.name = message.name || "Player " + player.id.slice(0, 4);
        const room = joinRoom(message.code, player);

        if (!room) {
          sendMessage(socket, {
            type: "error",
            message: "Room not found",
          });
          return;
        }

        sendMessage(socket, {
          type: "room_joined",
          code: room.code,
          playerName: player.name,
        });

        // Avisar al host que han entrat
        sendMessage(room.host.socket, {
          type: "player_joined",
          playerName: player.name,
        });

        // Començar el joc
        setTimeout(() => {
          void startGame(room);
        }, 500);

        console.log(`Jugador ${player.name} s'ha unit a ${room.code}`);
      }

      // Respondre pregunta
      if (message.type === "answer") {
        if (!player.roomCode) return;

        const room = getRoomByCode(player.roomCode);
        if (!room) return;

        const isHostPlayer = room.host.id === player.id;
        const correctIndex = isHostPlayer ? room.hostCorrectIndex : room.guestCorrectIndex; 
        const isCorrect = message.answerIndex === correctIndex;

        if (isCorrect) {
          player.score += 1;
        }

        player.answered = true;

        const opponent = getOpponent(room, player.id);

        // Enviar resultat al jugador
        sendMessage(socket, {
          type: "answer_result",
          correct: isCorrect,
          playerScore: player.score,
          opponentScore: opponent?.score || 0,
        });

        // Actualitzar score al adversari
        if (opponent) {
          sendMessage(opponent.socket, {
            type: "score_update",
            playerScore: opponent.score,
            opponentScore: player.score,
          });
        }

        // Si tots dos han respost, carrega la pregunta siguiente
        if (room.host.answered && room.guest?.answered) {
          setTimeout(() => {
            void nextQuestion(room);
          }, 1000);
        }
      }

      // Deixar la sala
      if (message.type === "leave_room") {
        if (player.roomCode) {
          const room = getRoomByCode(player.roomCode);
          if (room) {
            const opponent = getOpponent(room, player.id);
            if (opponent) {
              sendMessage(opponent.socket, {
                type: "opponent_left",
              });
            }
            eliminarPlayerRoom(player.id);
          }
        }
      }
    });

    // Si la connexió es tanca
    socket.on("close", () => {
      if (player.roomCode) {
        const room = getRoomByCode(player.roomCode);
        if (room) {
          const opponent = getOpponent(room, player.id);
          if (opponent) {
            sendMessage(opponent.socket, {
              type: "opponent_left",
            });
          }
          eliminarPlayerRoom(player.id);
        }
      }
      console.log(`Jugador desconnectat: ${player.id}`);
    });
  });
}
