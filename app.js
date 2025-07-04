const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 建立或開啟資料庫檔案
const db = new sqlite3.Database('./db/prices.db', err => {
    if (err) {
        console.error('Failed to open DB', err.message);
    } else {
        console.log('Database opened');
    }
});

// 建表
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL
    )
  `);
});

// 新增商品價格資料
app.post('/api/price', (req, res) => {
    const { date, product_name, price } = req.body;
    if (!date || !product_name || price === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare('INSERT INTO prices (date, product_name, price) VALUES (?, ?, ?)');
    stmt.run(date, product_name, price, function(err) {
        if (err) {
            return res.status(500).json({ error: 'DB insert failed' });
        }
        res.json({ message: 'Price inserted', id: this.lastID });
    });
    stmt.finalize();
});

// 查詢商品價格（可帶 product_name 篩選）
app.get('/api/prices', (req, res) => {
    let sql = 'SELECT * FROM prices';
    const params = [];
    if (req.query.product_name) {
        sql += ' WHERE product_name LIKE ?';
        params.push(`%${req.query.product_name}%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'DB query failed' });
        }
        res.json(rows);
    });
});

// 刪除商品價格資料（根據 id）
app.delete('/api/price/:id', (req, res) => {
    const id = req.params.id;
    const stmt = db.prepare('DELETE FROM prices WHERE id = ?');
    stmt.run(id, function(err) {
        if (err) {
            return res.status(500).json({ error: 'DB delete failed' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Price not found' });
        }
        res.json({ message: 'Price deleted', id });
    });
    stmt.finalize();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
