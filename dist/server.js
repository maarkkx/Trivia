"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const ws_1 = require("ws");
const app_1 = __importDefault(require("./app"));
const sockets_1 = require("./sockets");
const PORT = process.env.PORT || 3000;
// Crear servidor HTTP
const server = (0, http_1.createServer)(app_1.default);
// Crear servidor WebSocket
const wss = new ws_1.WebSocketServer({ server });
// Registrar handlers de WebSocket
(0, sockets_1.registerSocketHandlers)(wss);
// Iniciar servidor
server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Servidor funcionado a port ${PORT}`);
});
