"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const ws_1 = require("ws");
const app_1 = __importDefault(require("./app"));
const PORT = 3000;
const server = (0, http_1.createServer)(app_1.default);
const wss = new ws_1.WebSocketServer({ server });
wss.on("connection", (socket) => {
    console.log("Cliente conectado por WebSocket");
    socket.send(JSON.stringify({
        type: "connection",
        message: "Connected to server"
    }));
    socket.on("message", (data) => {
        const message = data.toString();
        console.log("Message received", message);
        socket.send(JSON.stringify({
            type: "echo",
            message: `El servidor recibió: ${message}`
        }));
    });
    socket.on("close", () => {
        console.log("Cliente desconectado");
    });
});
server.listen(PORT, () => {
    console.log(`Servidor HTTP en http://localhost:${PORT}`);
});
