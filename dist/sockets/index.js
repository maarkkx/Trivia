"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const roomManager_1 = require("../game/roomManager");
const triviaApi_service_1 = require("../services/triviaApi.service");
function generatePlayerId() {
    return crypto.randomUUID();
}
function sendMessage(socket, message) {
    socket.send(JSON.stringify(message));
}
// Parsegem el missatge entrant i descartem payloads mal formats.
function parseMessage(data) {
    try {
        return JSON.parse(data.toString());
    }
    catch {
        return null;
    }
}
// Validem i netegem el nom per evitar valors buits o massa llargs.
function normalizePlayerName(name) {
    const normalizedName = name.trim().slice(0, 16);
    return normalizedName.length > 0 ? normalizedName : null;
}
function getWinnerForHost(hostScore, guestScore) {
    return hostScore >= guestScore ? "you" : "opponent";
}
function getWinnerForGuest(hostScore, guestScore) {
    return guestScore >= hostScore ? "you" : "opponent";
}
function sendGameOver(room) {
    const hostScore = room.host.score;
    const guestScore = room.guest?.score ?? 0;
    const finalMessage = `Final score: ${hostScore} - ${guestScore}`;
    sendMessage(room.host.socket, {
        type: "game_over",
        winner: getWinnerForHost(hostScore, guestScore),
        message: finalMessage,
    });
    if (room.guest) {
        sendMessage(room.guest.socket, {
            type: "game_over",
            winner: getWinnerForGuest(hostScore, guestScore),
            message: finalMessage,
        });
    }
    room.status = "finished";
}
// Preparem dues preguntes (una per jugador) i guardem els indexos correctes al servidor.
async function prepareRound(room) {
    const [hostQuestion, guestQuestion] = await Promise.all([
        (0, triviaApi_service_1.getRandomQuestion)(),
        (0, triviaApi_service_1.getRandomQuestion)(),
    ]);
    const hostCorrectIndex = hostQuestion.allAnswers.findIndex((answer) => answer === hostQuestion.correctAnswer);
    const guestCorrectIndex = guestQuestion.allAnswers.findIndex((answer) => answer === guestQuestion.correctAnswer);
    if (hostCorrectIndex < 0 || guestCorrectIndex < 0) {
        throw new Error("Could not resolve correct answer index");
    }
    room.hostCorrectIndex = hostCorrectIndex;
    room.guestCorrectIndex = guestCorrectIndex;
    (0, roomManager_1.resetPlayerAnswers)(room);
    return {
        hostQuestion: {
            question: hostQuestion.question,
            answers: hostQuestion.allAnswers,
        },
        guestQuestion: {
            question: guestQuestion.question,
            answers: guestQuestion.allAnswers,
        },
    };
}
async function sendGameStart(room) {
    try {
        const round = await prepareRound(room);
        const hostName = room.host.name ?? "Host";
        const guestName = room.guest?.name ?? "Guest";
        room.questionsAsked = 1;
        room.status = "playing";
        sendMessage(room.host.socket, {
            type: "game_start",
            question: round.hostQuestion.question,
            answers: round.hostQuestion.answers,
            playerName: hostName,
            opponentName: guestName,
        });
        if (room.guest) {
            sendMessage(room.guest.socket, {
                type: "game_start",
                question: round.guestQuestion.question,
                answers: round.guestQuestion.answers,
                playerName: guestName,
                opponentName: hostName,
            });
        }
    }
    catch (error) {
        console.error("Error loading start questions:", error);
        sendMessage(room.host.socket, {
            type: "error",
            message: "Could not load questions",
        });
        if (room.guest) {
            sendMessage(room.guest.socket, {
                type: "error",
                message: "Could not load questions",
            });
        }
    }
}
async function sendNextQuestion(room) {
    if (!room.guest) {
        return;
    }
    if (room.questionsAsked >= 8 || room.host.score >= 8 || room.guest.score >= 8) {
        sendGameOver(room);
        return;
    }
    try {
        const round = await prepareRound(room);
        room.questionsAsked += 1;
        sendMessage(room.host.socket, {
            type: "new_question",
            question: round.hostQuestion.question,
            answers: round.hostQuestion.answers,
        });
        sendMessage(room.guest.socket, {
            type: "new_question",
            question: round.guestQuestion.question,
            answers: round.guestQuestion.answers,
        });
    }
    catch (error) {
        console.error("Error loading next questions:", error);
        sendMessage(room.host.socket, {
            type: "error",
            message: "Could not load next question",
        });
        if (room.guest) {
            sendMessage(room.guest.socket, {
                type: "error",
                message: "Could not load next question",
            });
        }
    }
}
function markPlayerAnswered(room, isHostPlayer) {
    if (isHostPlayer) {
        room.hostAnswered = true;
        return;
    }
    room.guestAnswered = true;
}
function hasPlayerAnswered(room, isHostPlayer) {
    return isHostPlayer ? room.hostAnswered : room.guestAnswered;
}
function getExpectedAnswerIndex(room, isHostPlayer) {
    return isHostPlayer ? room.hostCorrectIndex : room.guestCorrectIndex;
}
function registerSocketHandlers(wss) {
    wss.on("connection", (socket) => {
        const player = {
            id: generatePlayerId(),
            socket,
            roomCode: null,
            score: 0,
        };
        sendMessage(socket, {
            type: "connected",
            playerId: player.id,
        });
        socket.on("message", async (data) => {
            const message = parseMessage(data);
            if (!message) {
                sendMessage(socket, {
                    type: "error",
                    message: "Invalid message format",
                });
                return;
            }
            switch (message.type) {
                case "create_room": {
                    const playerName = normalizePlayerName(message.name);
                    if (!playerName) {
                        sendMessage(socket, {
                            type: "error",
                            message: "Name is required",
                        });
                        return;
                    }
                    player.name = playerName;
                    const room = (0, roomManager_1.createRoom)(player);
                    sendMessage(socket, {
                        type: "room_created",
                        code: room.code,
                        playerName,
                    });
                    break;
                }
                case "join_room": {
                    const playerName = normalizePlayerName(message.name);
                    if (!playerName) {
                        sendMessage(socket, {
                            type: "error",
                            message: "Name is required",
                        });
                        return;
                    }
                    player.name = playerName;
                    const room = (0, roomManager_1.joinRoom)(message.code, player);
                    if (!room) {
                        sendMessage(socket, {
                            type: "error",
                            message: "Room not found or full",
                        });
                        return;
                    }
                    sendMessage(socket, {
                        type: "room_joined",
                        code: room.code,
                        playerName,
                    });
                    sendMessage(room.host.socket, {
                        type: "player_joined",
                        playerId: player.id,
                        playerName,
                    });
                    // Petit delay per donar temps a renderitzar la pantalla de lobby.
                    setTimeout(() => {
                        void sendGameStart(room);
                    }, 1000);
                    break;
                }
                case "answer": {
                    if (!player.roomCode) {
                        return;
                    }
                    const room = (0, roomManager_1.getRoomByCode)(player.roomCode);
                    if (!room || !room.guest || room.status !== "playing") {
                        return;
                    }
                    if (!Number.isInteger(message.answerIndex) || message.answerIndex < 0 || message.answerIndex > 3) {
                        sendMessage(socket, {
                            type: "error",
                            message: "Invalid answer index",
                        });
                        return;
                    }
                    const isHostPlayer = room.host.id === player.id;
                    if (hasPlayerAnswered(room, isHostPlayer)) {
                        sendMessage(socket, {
                            type: "error",
                            message: "You already answered this round",
                        });
                        return;
                    }
                    const expectedIndex = getExpectedAnswerIndex(room, isHostPlayer);
                    if (expectedIndex === undefined) {
                        sendMessage(socket, {
                            type: "error",
                            message: "Question is not ready",
                        });
                        return;
                    }
                    // Validacio autoritativa: el servidor decideix si es correcta.
                    const isCorrect = message.answerIndex === expectedIndex;
                    if (isCorrect) {
                        player.score += 1;
                    }
                    markPlayerAnswered(room, isHostPlayer);
                    const opponent = (0, roomManager_1.getOpponent)(room, player.id);
                    sendMessage(socket, {
                        type: "answer_result",
                        correct: isCorrect,
                        playerScore: player.score,
                        opponentScore: opponent?.score ?? 0,
                        cooldown: isCorrect ? undefined : 5,
                    });
                    if (opponent) {
                        sendMessage(opponent.socket, {
                            type: "score_update",
                            playerScore: opponent.score,
                            opponentScore: player.score,
                        });
                    }
                    if (room.hostAnswered && room.guestAnswered) {
                        setTimeout(() => {
                            void sendNextQuestion(room);
                        }, 1200);
                    }
                    break;
                }
                case "leave_room": {
                    if (!player.roomCode) {
                        return;
                    }
                    const room = (0, roomManager_1.getRoomByCode)(player.roomCode);
                    if (!room) {
                        return;
                    }
                    const opponent = (0, roomManager_1.getOpponent)(room, player.id);
                    if (opponent) {
                        sendMessage(opponent.socket, {
                            type: "opponent_left",
                        });
                    }
                    (0, roomManager_1.removePlayerFromRoom)(player);
                    break;
                }
                default: {
                    sendMessage(socket, {
                        type: "error",
                        message: "Unknown message type",
                    });
                }
            }
        });
        socket.on("close", () => {
            if (player.roomCode) {
                const room = (0, roomManager_1.getRoomByCode)(player.roomCode);
                if (room) {
                    const opponent = (0, roomManager_1.getOpponent)(room, player.id);
                    if (opponent) {
                        sendMessage(opponent.socket, {
                            type: "opponent_left",
                        });
                    }
                }
            }
            (0, roomManager_1.removePlayerFromRoom)(player);
        });
    });
}
