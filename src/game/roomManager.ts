import type { Player, Room } from "../types/game.types";

const rooms = new Map<string, Room>();

const ROOM_CODE_LENGTH = 6;
//caracteres permitidos
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

//generar un codigo random
function generateRoomCode(): string {
  let code = "";

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[randomIndex];
  }

  return code;
}

//evitar que hayan codigos replciados
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
  };

  //guardamos el codigo dentro del player
  host.roomCode = code;

  //añadimos la room con el code
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

  //si ya hay 2 jugadores devuelve null
  if (room.guest) {
    return null;
  }

  room.guest = guest;
  room.status = "playing";
  guest.roomCode = code;

  return room;
}

export function getOpponent(room: Room, playerId: string): Player | null {
  //si lo pide el host le damos la id del que se une a la sala
  if (room.host.id === playerId) {
    return room.guest;
  }

  //aqui al reves
  if (room.guest && room.guest.id === playerId) {
    return room.host;
  }

  return null;
}

export function removePlayerFromRoom(player: Player): Room | null {
  if (!player.roomCode) {
    return null;
  }

  //miramos si el jugador tiene una room asignada
  const room = rooms.get(player.roomCode);

  if (!room) {
    player.roomCode = null;
    return null;
  }

  if (room.host.id === player.id) {
    rooms.delete(room.code);

    if (room.guest) {
      room.guest.roomCode = null;
    }

    player.roomCode = null;
    return room;
  }

  if (room.guest && room.guest.id === player.id) {
    room.guest = null;
    room.status = "waiting";
    player.roomCode = null;
    return room;
  }

  player.roomCode = null;
  return null;
}

export function removeRoom(code: string): void {
  rooms.delete(code);
}
