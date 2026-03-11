import express from "express";
import path from "path";

const app = express();

// Middleware
app.use(express.json());

// Servir archivos estáticos de public/
app.use(express.static(path.join(__dirname, "../public")));

// Servir archivos compilados del cliente (JS compilado desde TS)
app.use(express.static(path.join(__dirname, "../dist/client")));

// Si no es una llamada API, servir index.html (Single Page App)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

export default app;
