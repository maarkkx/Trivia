"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRoomByCode = getRoomByCode;
exports.joinRoom = joinRoom;
exports.getOpponent = getOpponent;
exports.removePlayerFromRoom = removePlayerFromRoom;
exports.resetPlayerAnswers = resetPlayerAnswers;
const rooms = new Map();
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateRoomCode() {
    let code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
        code += ROOM_CODE_CHARS[randomIndex];
    }
    return code;
}
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
        questionsAsked: 0,
        hostAnswered: false,
        guestAnswered: false,
    };
    host.roomCode = code;
    host.score = 0;
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
    if (room.guest) {
        return null;
    }
    room.guest = guest;
    room.status = "playing";
    guest.roomCode = code;
    guest.score = 0;
    return room;
}
function getOpponent(room, playerId) {
    if (room.host.id === playerId) {
        return room.guest;
    }
    if (room.guest && room.guest.id === playerId) {
        return room.host;
    }
    return null;
}
function removePlayerFromRoom(player) {
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
function resetPlayerAnswers(room) {
    room.hostAnswered = false;
    room.guestAnswered = false;
}
