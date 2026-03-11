import { RawData, WebSocket, WebSocketServer } from "ws";
import {
  createRoom,
  getOpponent,
  getRoomByCode,
  joinRoom,
  removePlayerFromRoom,
  resetPlayerAnswers,
} from "../game/roomManager";
import { getRandomQuestion } from "../services/triviaApi.service";
import type { ClientMessage, Player, Room, ServerMessage } from "../types/game.types";

function generatePlayerId(): string {
  return crypto.randomUUID();
}

function sendMessage(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

// Parsegem el missatge entrant i descartem payloads mal formats.
function parseMessage(data: RawData): ClientMessage | null {
  try {
    return JSON.parse(data.toString()) as ClientMessage;
  } catch {
    return null;
  }
}

function getWinnerForHost(hostScore: number, guestScore: number): "you" | "opponent" {
  return hostScore >= guestScore ? "you" : "opponent";
}

function getWinnerForGuest(hostScore: number, guestScore: number): "you" | "opponent" {
  return guestScore >= hostScore ? "you" : "opponent";
}

function sendGameOver(room: Room): void {
  const hostScore = room.host.score;
  const guestScore = room.guest?.score ?? 0;
  const finalMessage = `Final score: ${hostScore} - ${guestScore}`;

  sendMessage(room.host.socket, {
    type: "game_over",
    winner: getWinnerForHost(hostScore, guestScore),
    message: finalMessage,
  });

  if (room.guest) {
    sendMessage(room.guest.socket, {
      type: "game_over",
      winner: getWinnerForGuest(hostScore, guestScore),
      message: finalMessage,
    });
  }

  room.status = "finished";
}

// Preparem dues preguntes (una per jugador) i guardem els indexos correctes al servidor.
async function prepareRound(room: Room): Promise<{
  hostQuestion: { question: string; answers: string[] };
  guestQuestion: { question: string; answers: string[] };
}> {
  const [hostQuestion, guestQuestion] = await Promise.all([
    getRandomQuestion(),
    getRandomQuestion(),
  ]);

  const hostCorrectIndex = hostQuestion.allAnswers.findIndex(
    (answer) => answer === hostQuestion.correctAnswer
  );
  const guestCorrectIndex = guestQuestion.allAnswers.findIndex(
    (answer) => answer === guestQuestion.correctAnswer
  );

  if (hostCorrectIndex < 0 || guestCorrectIndex < 0) {
    throw new Error("Could not resolve correct answer index");
  }

  room.hostCorrectIndex = hostCorrectIndex;
  room.guestCorrectIndex = guestCorrectIndex;
  resetPlayerAnswers(room);

  return {
    hostQuestion: {
      question: hostQuestion.question,
      answers: hostQuestion.allAnswers,
    },
    guestQuestion: {
      question: guestQuestion.question,
      answers: guestQuestion.allAnswers,
    },
  };
}

async function sendGameStart(room: Room): Promise<void> {
  try {
    const round = await prepareRound(room);

    room.questionsAsked = 1;
    room.status = "playing";

    sendMessage(room.host.socket, {
      type: "game_start",
      question: round.hostQuestion.question,
      answers: round.hostQuestion.answers,
    });

    if (room.guest) {
      sendMessage(room.guest.socket, {
        type: "game_start",
        question: round.guestQuestion.question,
        answers: round.guestQuestion.answers,
      });
    }
  } catch (error) {
    console.error("Error loading start questions:", error);
    sendMessage(room.host.socket, {
      type: "error",
      message: "Could not load questions",
    });

    if (room.guest) {
      sendMessage(room.guest.socket, {
        type: "error",
        message: "Could not load questions",
      });
    }
  }
}

async function sendNextQuestion(room: Room): Promise<void> {
  if (!room.guest) {
    return;
  }

  if (room.questionsAsked >= 8 || room.host.score >= 8 || room.guest.score >= 8) {
    sendGameOver(room);
    return;
  }

  try {
    const round = await prepareRound(room);
    room.questionsAsked += 1;

    sendMessage(room.host.socket, {
      type: "new_question",
      question: round.hostQuestion.question,
      answers: round.hostQuestion.answers,
    });

    sendMessage(room.guest.socket, {
      type: "new_question",
      question: round.guestQuestion.question,
      answers: round.guestQuestion.answers,
    });
  } catch (error) {
    console.error("Error loading next questions:", error);
    sendMessage(room.host.socket, {
      type: "error",
      message: "Could not load next question",
    });

    if (room.guest) {
      sendMessage(room.guest.socket, {
        type: "error",
        message: "Could not load next question",
      });
    }
  }
}

function markPlayerAnswered(room: Room, isHostPlayer: boolean): void {
  if (isHostPlayer) {
    room.hostAnswered = true;
    return;
  }

  room.guestAnswered = true;
}

function hasPlayerAnswered(room: Room, isHostPlayer: boolean): boolean {
  return isHostPlayer ? room.hostAnswered : room.guestAnswered;
}

function getExpectedAnswerIndex(room: Room, isHostPlayer: boolean): number | undefined {
  return isHostPlayer ? room.hostCorrectIndex : room.guestCorrectIndex;
}

export function registerSocketHandlers(wss: WebSocketServer): void {
  wss.on("connection", (socket: WebSocket) => {
    const player: Player = {
      id: generatePlayerId(),
      socket,
      roomCode: null,
      score: 0,
    };

    sendMessage(socket, {
      type: "connected",
      playerId: player.id,
    });

    socket.on("message", async (data) => {
      const message = parseMessage(data);

      if (!message) {
        sendMessage(socket, {
          type: "error",
          message: "Invalid message format",
        });
        return;
      }

      switch (message.type) {
        case "create_room": {
          const room = createRoom(player);
          sendMessage(socket, {
            type: "room_created",
            code: room.code,
          });
          break;
        }

        case "join_room": {
          const room = joinRoom(message.code, player);

          if (!room) {
            sendMessage(socket, {
              type: "error",
              message: "Room not found or full",
            });
            return;
          }

          sendMessage(socket, {
            type: "room_joined",
            code: room.code,
          });

          sendMessage(room.host.socket, {
            type: "player_joined",
            playerId: player.id,
          });

          // Petit delay per donar temps a renderitzar la pantalla de lobby.
          setTimeout(() => {
            void sendGameStart(room);
          }, 1000);

          break;
        }

        case "answer": {
          if (!player.roomCode) {
            return;
          }

          const room = getRoomByCode(player.roomCode);
          if (!room || !room.guest || room.status !== "playing") {
            return;
          }

          if (!Number.isInteger(message.answerIndex) || message.answerIndex < 0 || message.answerIndex > 3) {
            sendMessage(socket, {
              type: "error",
              message: "Invalid answer index",
            });
            return;
          }

          const isHostPlayer = room.host.id === player.id;

          if (hasPlayerAnswered(room, isHostPlayer)) {
            sendMessage(socket, {
              type: "error",
              message: "You already answered this round",
            });
            return;
          }

          const expectedIndex = getExpectedAnswerIndex(room, isHostPlayer);
          if (expectedIndex === undefined) {
            sendMessage(socket, {
              type: "error",
              message: "Question is not ready",
            });
            return;
          }

          // Validacio autoritativa: el servidor decideix si es correcta.
          const isCorrect = message.answerIndex === expectedIndex;
          if (isCorrect) {
            player.score += 1;
          }

          markPlayerAnswered(room, isHostPlayer);

          const opponent = getOpponent(room, player.id);
          sendMessage(socket, {
            type: "answer_result",
            correct: isCorrect,
            playerScore: player.score,
            opponentScore: opponent?.score ?? 0,
            cooldown: isCorrect ? undefined : 5,
          });

          if (opponent) {
            sendMessage(opponent.socket, {
              type: "score_update",
              playerScore: opponent.score,
              opponentScore: player.score,
            });
          }

          if (room.hostAnswered && room.guestAnswered) {
            setTimeout(() => {
              void sendNextQuestion(room);
            }, 1200);
          }

          break;
        }

        case "leave_room": {
          if (!player.roomCode) {
            return;
          }

          const room = getRoomByCode(player.roomCode);
          if (!room) {
            return;
          }

          const opponent = getOpponent(room, player.id);
          if (opponent) {
            sendMessage(opponent.socket, {
              type: "opponent_left",
            });
          }

          removePlayerFromRoom(player);
          break;
        }

        default: {
          sendMessage(socket, {
            type: "error",
            message: "Unknown message type",
          });
        }
      }
    });

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
        }
      }

      removePlayerFromRoom(player);
    });
  });
}
