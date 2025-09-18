import express from "express";
import { getNews, createNews, deleteNews } from "../controllers/adminController.js";

const router = express.Router();

// 前台：获取新闻列表
router.get("/news", getNews);

// 管理端：新增 / 删除
router.post("/admin/news", createNews);
router.delete("/admin/news/:id", deleteNews);

export default router;