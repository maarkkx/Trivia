import express from "express";
import path from "path";

const app = express();

// Middleware
app.use(express.json());

// Servir arxius estàtics de la carpeta public
const rootDir = process.cwd();
app.use(express.static(path.join(rootDir, "public")));

// Ruta catch-all per servir l'index.html (SPA)
app.get(/.*/, (req, res) => {
  res.sendFile(path.resolve(rootDir, "index.html"));
});

export default app;