"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
// Servir arxius estàtics de la carpeta public
const rootDir = process.cwd();
app.use(express_1.default.static(path_1.default.join(rootDir, "public")));
// Ruta catch-all per servir l'index.html (SPA)
app.get(/.*/, (req, res) => {
    res.sendFile(path_1.default.resolve(rootDir, "index.html"));
});
exports.default = app;
