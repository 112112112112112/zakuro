const db = require(`./database.js`);

const tasks = [
    // * Daily + Account
    { title: `Battle Pass Daily`, reset: `daily`, bound: `account`},
    { title: `x5 Serpentium Dungeon`, reset: `daily`, bound: `account`},

    // * Daily + Character
    { title: `Heroic Dungeon`, reset: `daily`, bound: `character`},
    { title: `Aqua Whistle`, reset: `daily`, bound: `character`},

    // * Weekly + Account
    { title: `ED Weekly Mission`, reset: `weekly`, bound: `account`},
    { title: `Battle Pass Weekly`, reset: `weekly`, bound: `account`},
    { title: `Enhancement Quest`, reset: `weekly`, bound: `account`},
    { title: `Secret Dungeon`, reset: `weekly`, bound: `account`},
    { title: `Blacksmith Craft`, reset: `weekly`, bound: `account`},
    { title: `Dragon Lens Craft`, reset: `weekly`, bound: `account`},
    { title: `x15 Serpentium Dungeon`, reset: `weekly`, bound: `account`},

    // * Weekly + Character
    { title: `Henir`, reset: `weekly`, bound: `character`},
    { title: `Abyss`, reset: `weekly`, bound: `character`},
    { title: `Serpentium`, reset: `weekly`, bound: `character`},
    { title: `Doom Aporia`, reset: `weekly`, bound: `character`},
    { title: `Challenge Mode`, reset: `weekly`, bound: `character`},
    { title: `x10 Spirit Lord's Temple`, reset: `weekly`, bound: `character`},

];

for (const task of tasks) {
    if (!task.title) continue;

    const taskExists = db.prepare('SELECT * FROM tasks WHERE title = ?').get(task.title);
    
    if (!taskExists) {
        db.prepare('INSERT INTO tasks(title, reset, bound) VALUES (?, ?, ?)').run(task.title, task.reset, task.bound);
    }
}