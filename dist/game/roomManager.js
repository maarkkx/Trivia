"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRoomByCode = getRoomByCode;
exports.joinRoom = joinRoom;
exports.getOpponent = getOpponent;
exports.eliminarPlayerRoom = eliminarPlayerRoom;
const rooms = new Map();
// Generar codi de sala de 6 caràcters
function generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
// Crear una nova sala
function createRoom(host) {
    let code = generateRoomCode();
    while (rooms.has(code)) {
        code = generateRoomCode();
    }
    const room = {
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
function getRoomByCode(code) {
    return rooms.get(code);
}
// Unir-se a una sala
function joinRoom(code, guest) {
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
function getOpponent(room, playerId) {
    if (room.host.id === playerId)
        return room.guest;
    if (room.guest?.id === playerId)
        return room.host;
    return null;
}
// Eliminar jugador de la sala
function eliminarPlayerRoom(playerId) {
    const room = Array.from(rooms.values()).find((r) => r.host.id === playerId || r.guest?.id === playerId);
    if (room) {
        rooms.delete(room.code);
    }
}
