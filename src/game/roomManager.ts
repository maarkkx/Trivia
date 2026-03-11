import type { Player, Room } from "../types/game.types";

const rooms = new Map<string, Room>();

const lengthCodigo = 6;
const caracteresCodigo = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generarRoomCode(): string {
  let codigo = "";
  for (let i = 0; i < lengthCodigo; i++) {
    const numRandom = Math.floor(Math.random() * caracteresCodigo.length);
    codigo += caracteresCodigo[numRandom];
  }
  return codigo;
}

function comprobarRooms(): string {
  let code = generarRoomCode();
  while (rooms.has(code)) {
    code = generarRoomCode();
  }
  return code;
}

export function crearRoom(host: Player): Room {
  const code = comprobarRooms();
  const room: Room = {
    code,
    host,
    guest: null,
    status: "waiting",
    questionsAsked: 0,
    hostAnswered: false,
    guestAnswered: false,
  };

  host.roomCode = code;
  host.score = 0;
  rooms.set(code, room);
  return room;
}

export function getRoomByCode(code: string): Room | undefined {
  return rooms.get(code);
}

export function unirRoom(code: string, guest: Player): Room | null {
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
  room.hostAnswered = false;
  room.guestAnswered = false;
}
