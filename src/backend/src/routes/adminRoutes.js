import express from "express";
import { getNews, createNews, deleteNews } from "../controllers/adminController.js";

const router = express.Router();

// Foreground reading
router.get("/news", getNews);

// Administrator Post/Delete
router.post("/news", createNews);
router.delete("/news/:id", deleteNews);

export default router;