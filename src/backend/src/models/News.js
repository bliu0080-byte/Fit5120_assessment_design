import Database from "better-sqlite3";

const db = new Database("./scamsafe.db");

db.exec(`
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  type TEXT CHECK(type IN ('sms','phone','email','investment','social','shopping','all')) NOT NULL,
  severity TEXT CHECK(severity IN ('low','medium','high','critical')) NOT NULL DEFAULT 'medium',
  url TEXT,
  image TEXT,
  source TEXT DEFAULT 'admin',
  timestamp TEXT NOT NULL
)`);

export default {
    all() {
        return db.prepare(`SELECT * FROM news ORDER BY datetime(timestamp) DESC`).all();
    },
    create(n) {
        db.prepare(`INSERT INTO news
      (id,title,description,content,type,severity,url,image,source,timestamp)
      VALUES (@id,@title,@description,@content,@type,@severity,@url,@image,@source,@timestamp)`).run(n);
        return n;
    },
    delete(id) {
        return db.prepare(`DELETE FROM news WHERE id=?`).run(id);
    }
};