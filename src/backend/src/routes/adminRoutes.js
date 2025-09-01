import express from "express";
import { getNews, createNews, deleteNews } from "../controllers/adminController.js";

const router = express.Router();

// 前台读取
router.get("/news", getNews);

// 管理员发布/删除
router.post("/news", createNews);
router.delete("/news/:id", deleteNews);

export default router;