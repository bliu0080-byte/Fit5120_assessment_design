import express from "express";
import { getNews, createNews, deleteNews } from "../controllers/adminController.js";

const router = express.Router();

// Frontend: Get News List
router.get("/news", getNews);

// Administration: Add / Delete
router.post("/admin/news", createNews);
router.delete("/admin/news/:id", deleteNews);

export default router;