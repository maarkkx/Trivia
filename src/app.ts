import express from "express";
import path from "path";

const app = express();

app.use(express.json());

const rootDir = process.cwd();

app.use(express.static(path.join(rootDir, "public")));

app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(rootDir, "index.html"));
});

export default app;