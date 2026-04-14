const classes = require('./classes.js');
const db = require('./database.js');

const chars = db.prepare('SELECT id, class FROM characters').all();

for (const char of chars) {
    let baseChar;

    for (const [charName, classList] of Object.entries(classes)) {
        if (classList.some(c => c.name === char.class)) {
            baseChar = charName;
            break;
        }
    }

    db.prepare('UPDATE characters SET base_character = ? WHERE id = ?').run(baseChar, char.id);

    console.log(`${char.class} = ${baseChar}`);
}