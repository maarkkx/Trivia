import { WebSocketServer, WebSocket, RawData } from "ws";
import { createRoom, joinRoom } from "../game/roomManager";
import type {
  ClientMessage,
  Player,
  ServerMessage,
} from "../types/game.types";

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
          message: "Mensaje inválido",
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
              message: "La sala no existe o ya está llena",
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
            message: "Tipo de mensaje no soportado",
          });
        }
      }
    });
  });
}