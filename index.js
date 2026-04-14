const { ProxyAgent, setGlobalDispatcher } = require('undici');
setGlobalDispatcher(new ProxyAgent('socks5://127.0.0.1:40000'));

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { token } = require('./config.json');
const cron = require('node-cron');
const db = require('./database.js');
const classes = require('./classes.js');
require('./tasks.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// * Dynamic command handler
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// * Event handling

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// * Daily reminder
cron.schedule('0 20 * * *', async () => {
	const channel = await client.channels.fetch('1426625638483103966');
	const users = db.prepare('SELECT id FROM users').all();

	for (const user of users) {
		const hasChars = db.prepare('SELECT id FROM characters WHERE user_id = ?').get(user.id);

		if (!hasChars) {
			const missingDailies = db.prepare(`SELECT tasks.title 
				FROM tasks JOIN checklist ON tasks.id = checklist.task_id 
				WHERE checklist.user_id = ? AND checklist.completed = 0 AND tasks.reset = 'daily' AND checklist.character_id IS NULL`).all(user.id);

			if (missingDailies.length > 0) {
				const taskList = missingDailies.map(t => `- ${t.title}`).join('\n');
				const fullMsg = `<@${user.id}>, don't forget to complete your dailies! Here's what you are missing:\n## Dailies\n${taskList}`
				await channel.send(fullMsg);
			}
		}
	}
}, {
	timezone: 'UTC'
});

// * Daily reset
cron.schedule('0 0 * * *', async () => {
	db.prepare("UPDATE checklist SET completed = 0 WHERE task_id IN (SELECT id FROM tasks WHERE reset = 'daily')").run();
	const channel = await client.channels.fetch('1426625638483103966');
	await channel.send('Daily tasks have been reset!');
}, {
	timezone: 'UTC'
});

// * Weekly reminder 
cron.schedule('0 0 * * 2', async () => {
	const channel = await client.channels.fetch('1426625638483103966');
	const users = db.prepare('SELECT id FROM users').all();
	const userClasses = Object.values(classes).flat();

	for (const user of users) {
		const hasChars = db.prepare('SELECT id FROM characters WHERE user_id = ?').get(user.id);
		
		if (!hasChars) {
			const missingWeeklies = db.prepare(`SELECT tasks.title, characters.name AS char_name, characters.class AS char_class 
			FROM tasks JOIN checklist ON tasks.id = checklist.task_id 
			LEFT JOIN characters ON checklist.character_id = characters.id 
			WHERE checklist.user_id = ? AND checklist.completed = 0 AND tasks.reset = 'weekly'`).all(user.id);

			if (missingWeeklies.length > 0) {
				const charMap = {};
				for (const t of missingWeeklies) {
					if (t.char_name) {
						const emote = userClasses.find(cls => cls.name === t.char_class).emote;
						const key = `${emote} **${t.char_name}**`;
						if (!charMap[key]) {
							charMap[key] = [];
						}
						charMap[key].push(t.title);
					} else {
						if (!charMap['account']) {
							charMap['account'] = [];
						}
						charMap['account'].push(t.title);
					}
				}

				const taskList = Object.entries(charMap).map(([char, tasks]) => {
					const header = char === 'account' ? '' : char;
					return `${header}\n${tasks.map(t => `- ${t}`).join('\n')}`;
				}).join('\n\n');

				const fullMsg = `<@${user.id}>, don't forget to complete your weeklies! Here's what you are missing:\n## Weeklies\n${taskList}`
				const msg = fullMsg.length > 2000 ? fullMsg.substring(0, 1997) + '...' : fullMsg;
				await channel.send(msg);
			}
		}
	}
}, {
	timezone: 'UTC'
});

// * Weekly reset
cron.schedule('0 10 * * 3', async () => {
	db.prepare("UPDATE checklist SET completed = 0 WHERE task_id IN (SELECT id FROM tasks WHERE reset = 'weekly')").run();
	const channel = await client.channels.fetch('1426625638483103966');
	await channel.send('Weekly tasks have been reset!');
}, {
	timezone: 'UTC'
});

client.login(token);