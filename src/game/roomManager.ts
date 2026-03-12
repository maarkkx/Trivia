import type { Player, Room } from "../types/game.types";

const rooms = new Map<string, Room>();

// Generar codi de sala de 6 caràcters
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Crear una nova sala
export function createRoom(host: Player): Room {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: Room = {
    code,
    host,
    guest: null,
    status: "waiting",
    questionsAsked: 0,
    hostCorrectIndex: -1,
    guestCorrectIndex: -1,
  };

  host.roomCode = code;
  host.score = 0;
  rooms.set(code, room);
  return room;
}

// Obtenir sala per codi
export function getRoomByCode(code: string): Room | undefined {
  return rooms.get(code);
}

// Unir-se a una sala
export function joinRoom(code: string, guest: Player): Room | null {
  const room = rooms.get(code);
  if (!room || room.guest) {
    return null;
  }

  room.guest = guest;
  guest.roomCode = code;
  guest.score = 0;
  return room;
}

// Obtenir l'altre jugador
export function getOpponent(room: Room, playerId: string): Player | null {
  if (room.host.id === playerId) return room.guest;
  if (room.guest?.id === playerId) return room.host;
  return null;
}

// Eliminar jugador de la sala
export function removePlayerFromRoom(playerId: string): void {
  const room = Array.from(rooms.values()).find(
    (r) => r.host.id === playerId || r.guest?.id === playerId
  );

  if (room) {
    rooms.delete(room.code);
  }
}
