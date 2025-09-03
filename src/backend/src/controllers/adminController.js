import crypto from "crypto";
import News from "../models/News.js";

export const getNews = (req, res) => {
    res.json({ items: News.all() });
};

export const createNews = (req, res) => {
    const a = req.body || {};
    const news = {
        id: crypto.randomUUID(),
        title: a.title || "Untitled",
        description: a.description || "",
        content: a.content || "",
        type: a.type || "all",
        severity: a.severity || "medium",
        url: a.url || "",
        image: a.image || "",
        source: a.source || "admin",
        timestamp: a.timestamp || new Date().toISOString()
    };
    News.create(news);
    res.json({ ok: true, news });
};

export const deleteNews = (req, res) => {
    News.delete(req.params.id);
    res.json({ ok: true });
};