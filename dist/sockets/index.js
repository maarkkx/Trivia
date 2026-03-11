"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const roomManager_1 = require("../game/roomManager");
function generatePlayerId() {
    return crypto.randomUUID();
}
function sendMessage(socket, message) {
    socket.send(JSON.stringify(message));
}
function parseMessage(data) {
    try {
        const parsedData = JSON.parse(data.toString());
        return parsedData;
    }
    catch {
        return null;
    }
}
function registerSocketHandlers(wss) {
    wss.on("connection", (socket) => {
        const player = {
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
                    message: "Error message",
                });
                return;
            }
            //miramos q tipo de mensaje es segun nuestros tipos
            switch (message.type) {
                case "create_room": {
                    const room = (0, roomManager_1.createRoom)(player);
                    sendMessage(socket, {
                        type: "room_created",
                        code: room.code,
                    });
                    break;
                }
                case "join_room": {
                    const room = (0, roomManager_1.joinRoom)(message.code, player);
                    if (!room) {
                        sendMessage(socket, {
                            type: "error",
                            message: "The code does not match any room, or the room is full.",
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
                        message: "Invalid message",
                    });
                }
            }
            //aqui alvaro miro si el jugador que se ha desconectado estaba en una sala, si estaba en una
            //le echa de la sala y avisa al enemigo y ya
            socket.on("close", () => {
                const roomCode = player.roomCode;
                if (!roomCode) {
                    return;
                }
                const room = (0, roomManager_1.getRoomByCode)(roomCode);
                if (!room) {
                    player.roomCode = null;
                    return;
                }
                const opponent = (0, roomManager_1.getOpponent)(room, player.id);
                (0, roomManager_1.removePlayerFromRoom)(player);
                if (opponent) {
                    sendMessage(opponent.socket, {
                        type: "opponent_left",
                    });
                }
            });
        });
    });
}
