const Database = require('better-sqlite3');
const db = new Database('bot.db');

/**
 ** Users table uses discord client id added automatically on bot use
 ** Users can add characters through commands
 ** Tasks are managed on its own task list file
 ** Users can mark tasks as completed for characters or account daily or weekly
 *? run() INSERT/UPDATE/DELETE || get() SELECT -> row/undefined || all() SELECT -> array with all rows || prepare() VALUES(?).run(value)
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        name TEXT,
        class TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        reset TEXT CHECK(reset IN ('daily', 'weekly')),
        bound TEXT CHECK(bound IN ('character', 'account'))
    );

    CREATE TABLE IF NOT EXISTS checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        character_id INTEGER,
        task_id INTEGER,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (character_id) REFERENCES characters(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
`);

module.exports = db;