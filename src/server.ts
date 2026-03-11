import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app"; // Asegúrate de que la ruta a app sea correcta
import { registerSocketHandlers } from "./sockets";

// Render asigna el puerto automáticamente, si no existe usa el 3000
const PORT = process.env.PORT || 3000;

const server = createServer(app);
const wss = new WebSocketServer({ server });

registerSocketHandlers(wss);

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`corregiendo ${PORT}`);
});