import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { registerSocketHandlers } from "./sockets";

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP
const server = createServer(app);

// Crear servidor WebSocket
const wss = new WebSocketServer({ server });

// Registrar handlers de WebSocket
registerSocketHandlers(wss);

// Iniciar servidor
server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Servidor funcionado a port ${PORT}`);
});