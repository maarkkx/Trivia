import { WebSocketServer, WebSocket, RawData } from "ws";
import {
  createRoom,
  joinRoom,
  getRoomByCode,
  getOpponent,
  removePlayerFromRoom,
} from "../game/roomManager";
import type { ClientMessage, Player, ServerMessage } from "../types/game.types";

function generatePlayerId(): string {
  return crypto.randomUUID();
}

function sendMessage(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

function parseMessage(data: RawData): ClientMessage | null {
  try {
    const parsedData = JSON.parse(data.toString()) as ClientMessage;
    return parsedData;
  } catch {
    return null;
  }
}

export function registerSocketHandlers(wss: WebSocketServer): void {
  wss.on("connection", (socket: WebSocket) => {
    const player: Player = {
      id: generatePlayerId(),
      socket,
      roomCode: null,
    };

    sendMessage(socket, {
      type: "connected",
      playerId: player.id,
    });

    socket.on("message", (data) => {
      const message = parseMessage(data);

      if (!message) {
        sendMessage(socket, {
          type: "error",
          message: "Error message",
        });
        return;
      }

      //miramos q tipo de mensaje es segun nuestros tipos
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
              message: "The code does not match any room, or the room is full.",
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

          break;
        }

        default: {
          sendMessage(socket, {
            type: "error",
            message: "Invalid message",
          });
        }
      }

			//aqui alvaro miro si el jugador que se ha desconectado estaba en una sala, si estaba en una
			//le echa de la sala y avisa al enemigo y ya
      socket.on("close", () => {
        const roomCode = player.roomCode;

        if (!roomCode) {
          return;
        }

        const room = getRoomByCode(roomCode);

        if (!room) {
          player.roomCode = null;
          return;
        }

        const opponent = getOpponent(room, player.id);

        removePlayerFromRoom(player);

        if (opponent) {
          sendMessage(opponent.socket, {
            type: "opponent_left",
          });
        }
      });
    });
  });
}
