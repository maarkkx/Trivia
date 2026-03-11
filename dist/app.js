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
// Servir archivos estáticos de public/
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
// Servir archivos compilados del cliente (JS compilado desde TS)
app.use(express_1.default.static(path_1.default.join(__dirname, "../dist/client")));
// Si no es una llamada API, servir index.html (Single Page App)
app.get(/.*/, (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../index.html"));
});
exports.default = app;
