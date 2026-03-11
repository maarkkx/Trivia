import type { Player, Room } from "../types/game.types";

const rooms = new Map<string, Room>();

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[randomIndex];
  }
  return code;
}

function generateUniqueRoomCode(): string {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
}

export function createRoom(host: Player): Room {
  const code = generateUniqueRoomCode();
  const room: Room = {
    code,
    host,
    guest: null,
    status: "waiting",
    currentQuestionIndex: 0,
    questionsAsked: 0,
    host_answered: false,
    guest_answered: false,
  };

  host.roomCode = code;
  host.score = 0;
  rooms.set(code, room);
  return room;
}

export function getRoomByCode(code: string): Room | undefined {
  return rooms.get(code);
}

export function joinRoom(code: string, guest: Player): Room | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }
  if (room.guest) {
    return null;
  }

  room.guest = guest;
  room.status = "playing";
  guest.roomCode = code;
  guest.score = 0;
  return room;
}

export function getOpponent(room: Room, playerId: string): Player | null {
  if (room.host.id === playerId) {
    return room.guest;
  }
  if (room.guest && room.guest.id === playerId) {
    return room.host;
  }
  return null;
}

export function removePlayerFromRoom(player: Player): Room | null {
  if (!player.roomCode) {
    return null;
  }

  const room = rooms.get(player.roomCode);
  if (!room) {
    player.roomCode = null;
    return null;
  }

  if (room.host.id === player.id) {
    room.status = "finished";
    rooms.delete(player.roomCode);
    return room;
  }

  if (room.guest && room.guest.id === player.id) {
    room.status = "finished";
    rooms.delete(player.roomCode);
    return room;
  }

  player.roomCode = null;
  return null;
}

export function resetPlayerAnswers(room: Room): void {
  room.host_answered = false;
  room.guest_answered = false;
}
