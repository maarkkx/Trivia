import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { registerSocketHandlers } from "./sockets";

const PORT = process.env.PORT || 3000;

const server = createServer(app);
const wss = new WebSocketServer({ server });

registerSocketHandlers(wss);

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`funcionando ${PORT}`);
});