import type { WebSocket } from "ws";

export interface Player {
  id: string;
  socket: WebSocket;
  roomCode: string | null;
}

export type RoomStatus = "waiting" | "playing";

export interface Room {
  code: string;
  host: Player;
  guest: Player | null;
  status: RoomStatus;
}

export type ClientMessage =
  | {
      type: "create_room";
    }
  | {
      type: "join_room";
      code: string;
    };

export type ServerMessage =
  | {
      type: "connected";
      playerId: string;
    }
  | {
      type: "room_created";
      code: string;
    }
  | {
      type: "room_joined";
      code: string;
    }
  | {
      type: "player_joined";
      playerId: string;
    }
  | {
      type: "error";
      message: string;
    };