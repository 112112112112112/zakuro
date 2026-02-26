const db = require('./database.js');

const tasks = [
    // * Daily + Account
    { title: '', reset: 'daily', bound: 'character'},

    // * Daily + Character

    // * Weekly + Account

    // * Weekly + Character
];

for (const task of tasks) {
    if (!task.title) continue;

    const taskExists = db.prepare('SELECT * FROM tasks WHERE title = ?').get(task.title);
    
    if (!taskExists) {
        db.prepare('INSERT INTO tasks(title, reset, bound) VALUES (?, ?, ?)').run(task.title, task.reset, task.bound);
    }
}