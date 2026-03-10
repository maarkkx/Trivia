import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";

const PORT = 3000;

const server = createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", (socket: WebSocket) => {
  console.log("Cliente conectado por WebSocket");

  socket.send(
    JSON.stringify({
      type: "connection",
      message: "Connected to server"
    })
  );

  socket.on("message", (data) => {
    const message = data.toString();

    console.log("Message received", message);

    socket.send(
      JSON.stringify({
        type: "echo",
        message: `El servidor recibió: ${message}`
      })
    );
  });

  socket.on("close", () => {
    console.log("Cliente desconectado");
  });
});

server.listen(PORT, () => {
  console.log(`Servidor HTTP en http://localhost:${PORT}`);
});