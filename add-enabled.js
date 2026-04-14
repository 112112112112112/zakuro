const db = require('./database.js');

db.prepare('ALTER TABLE checklist ADD COLUMN enabled INTEGER DEFAULT 1').run();