const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { token } = require('./config.json');
const cron = require('node-cron');
const db = require('./database.js');
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

// * Daily reset
cron.schedule('0 1 * * *', async () => {
	db.prepare("UPDATE checklist SET completed = 0 WHERE task_id IN (SELECT id FROM tasks WHERE reset = 'daily')").run();
	const channel = await client.channels.fetch('1426625638483103966');
	await channel.send('Daily tasks have been reset!');
}, {
	timezone: 'Europe/Madrid'
})

// * Weekly reminder before reset
cron.schedule('15 16 * * 2', async () => {
	const weeklies = db.prepare("SELECT title FROM tasks WHERE reset = 'weekly'").all();
	const weekliesList = weeklies.map(t => `✦ ${t.title}`).join('\n');
	const channel = await client.channels.fetch('1426625638483103966');
	await channel.send(`⚠️ **Weekly tasks will be reset in less than 9 hours!** ⚠️\nRemember to complete them!\n${weekliesList} ⚠️`);
})

// * Weekly reset
cron.schedule('0 0 * * 3', async () => {
	db.prepare("UPDATE checklist SET completed = 0 WHERE task_id IN (SELECT id FROM tasks WHERE reset = 'weekly')").run();
	const channel = await client.channels.fetch('1426625638483103966');
	await channel.send('Weekly tasks have been reset!');
})

client.login(token);