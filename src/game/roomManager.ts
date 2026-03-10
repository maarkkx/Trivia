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

export function removeRoom(code: string): void {
  rooms.delete(code);
}
