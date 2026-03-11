import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { registerSocketHandlers } from "./sockets";

const PORT = 3000;

const server = createServer(app);
const wss = new WebSocketServer({ server });

registerSocketHandlers(wss);

server.listen(PORT, () => {
  console.log(`funcionando http://localhost:${PORT}`);
});