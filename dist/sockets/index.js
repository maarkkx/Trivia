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
                    message: "Mensaje inválido",
                });
                return;
            }
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
                            message: "La sala no existe o ya está llena",
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
                        message: "Tipo de mensaje no soportado",
                    });
                }
            }
        });
    });
}
