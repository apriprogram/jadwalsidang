const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

// Database Configuration
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'jadwal_sidang_pro'
};

let pool;

async function initDB() {
    try {
        // Create connection without database to create the database if it doesn't exist
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        await connection.end();

        // Initialize connection pool
        pool = mysql.createPool(dbConfig);

        // Create Tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT PRIMARY KEY,
                name VARCHAR(255),
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                status VARCHAR(50),
                role VARCHAR(50),
                phone VARCHAR(50),
                instansi VARCHAR(255),
                photo LONGTEXT
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sidang_config (
                id INT PRIMARY KEY DEFAULT 1,
                headers JSON
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sidang_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                row_data JSON
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user VARCHAR(255),
                action TEXT,
                type VARCHAR(50),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('MySQL Database and Tables Initialized');
        
        // Migration from JSON if MySQL is empty
        await migrateFromJSON();
        return true;

    } catch (err) {
        console.error('Database Initialization Error:', err.message);
        return false;
    }
}

async function migrateFromJSON() {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
        console.log('MySQL is empty. Checking for JSON data to migrate...');
        
        const DATA_DIR = path.join(__dirname, 'data');
        const USERS_FILE = path.join(DATA_DIR, 'users.json');
        const SIDANG_FILE = path.join(DATA_DIR, 'sidang.json');
        const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

        // Migrate Users
        if (fs.existsSync(USERS_FILE)) {
            const users = JSON.parse(fs.readFileSync(USERS_FILE));
            for (const user of users) {
                await pool.query('INSERT IGNORE INTO users (id, name, username, password, status, role, phone, instansi, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [user.id, user.name, user.username, user.password, user.status, user.role, user.phone || null, user.instansi || null, user.photo || null]);
            }
            console.log(`Migrated ${users.length} users.`);
        }

        // Migrate Sidang
        if (fs.existsSync(SIDANG_FILE)) {
            const sidang = JSON.parse(fs.readFileSync(SIDANG_FILE));
            if (sidang.headers && sidang.headers.length > 0) {
                await pool.query('INSERT INTO sidang_config (id, headers) VALUES (1, ?) ON DUPLICATE KEY UPDATE headers = ?', [JSON.stringify(sidang.headers), JSON.stringify(sidang.headers)]);
                for (const row of (sidang.data || [])) {
                    await pool.query('INSERT INTO sidang_data (row_data) VALUES (?)', [JSON.stringify(row)]);
                }
                console.log(`Migrated ${sidang.data ? sidang.data.length : 0} sidang rows.`);
            }
        }

        // Migrate Logs
        if (fs.existsSync(LOGS_FILE)) {
            const logs = JSON.parse(fs.readFileSync(LOGS_FILE));
            for (const log of logs) {
                // Ensure timestamp format
                let ts = log.timestamp || new Date();
                await pool.query('INSERT INTO logs (user, action, type, timestamp) VALUES (?, ?, ?, ?)', 
                [log.user, log.action, log.type, ts]);
            }
            console.log(`Migrated ${logs.length} logs.`);
        }
    }
}

// API Endpoints
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const users = req.body;
        // The frontend sends the entire array. To sync, we delete and re-insert.
        // Not the most efficient, but matches current frontend logic.
        await pool.query('DELETE FROM users');
        for (const user of users) {
            await pool.query('INSERT INTO users (id, name, username, password, status, role, phone, instansi, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [user.id, user.name, user.username, user.password, user.status, user.role, user.phone || null, user.instansi || null, user.photo || null]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sidang', async (req, res) => {
    try {
        const [config] = await pool.query('SELECT headers FROM sidang_config WHERE id = 1');
        const [rows] = await pool.query('SELECT row_data FROM sidang_data');
        
        res.json({
            headers: config.length > 0 ? config[0].headers : [],
            data: rows.map(r => r.row_data)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sidang', async (req, res) => {
    try {
        const { headers, data } = req.body;
        
        await pool.query('INSERT INTO sidang_config (id, headers) VALUES (1, ?) ON DUPLICATE KEY UPDATE headers = ?', [JSON.stringify(headers), JSON.stringify(headers)]);
        
        await pool.query('DELETE FROM sidang_data');
        if (data && data.length > 0) {
            const values = data.map(row => [JSON.stringify(row)]);
            await pool.query('INSERT INTO sidang_data (row_data) VALUES ?', [values]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', async (req, res) => {
    try {
        const logs = req.body;
        // If empty array, clear logs
        if (logs.length === 0) {
            await pool.query('DELETE FROM logs');
        } else {
            // Usually we only add new logs, but frontend sends full list sometimes
            // To match current behavior:
            await pool.query('DELETE FROM logs');
            for (const log of logs) {
                await pool.query('INSERT INTO logs (user, action, type, timestamp) VALUES (?, ?, ?, ?)', 
                [log.user, log.action, log.type, log.timestamp || new Date()]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
initDB().then((success) => {
    if (success) {
        const server = app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Error: Port ${PORT} is already in use. Please close other applications or use a different port.`);
                process.exit(1);
            } else {
                console.error('Server Error:', err);
            }
        });
    } else {
        console.error('Server failed to start due to database connection error.');
        console.error('Please make sure XAMPP (MySQL) is running and active.');
        process.exit(1);
    }
}).catch(err => {
    console.error('Unexpected Startup Error:', err);
    process.exit(1);
});

