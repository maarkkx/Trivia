"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRoomByCode = getRoomByCode;
exports.joinRoom = joinRoom;
exports.getOpponent = getOpponent;
exports.removePlayerFromRoom = removePlayerFromRoom;
exports.removeRoom = removeRoom;
const rooms = new Map();
const ROOM_CODE_LENGTH = 6;
//caracteres permitidos
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//generar un codigo random
function generateRoomCode() {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
        code += ROOM_CODE_CHARS[randomIndex];
    }
    return code;
}
//evitar que hayan codigos replciados
function generateUniqueRoomCode() {
    let code = generateRoomCode();
    while (rooms.has(code)) {
        code = generateRoomCode();
    }
    return code;
}
function createRoom(host) {
    const code = generateUniqueRoomCode();
    const room = {
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
function getRoomByCode(code) {
    return rooms.get(code);
}
function joinRoom(code, guest) {
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
function getOpponent(room, playerId) {
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
function removePlayerFromRoom(player) {
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
function removeRoom(code) {
    rooms.delete(code);
}
