const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database.js');


module.exports = {
	data: new SlashCommandBuilder().setName('sync').setDescription('Update your checklist with your new characters'),
	async execute(interaction) {
        const tasks = db.prepare('SELECT id, bound FROM tasks').all();
        const chars = db.prepare('SELECT id FROM characters WHERE user_id = ?').all(interaction.user.id);
        for (const task of tasks) {
            if (task.bound === 'account') {
                const taskExists = db.prepare('SELECT * FROM checklist WHERE user_id = ? AND task_id = ? AND character_id IS NULL').get(interaction.user.id, task.id);
                if (!taskExists) {
                    db.prepare('INSERT INTO checklist (user_id, task_id, completed) VALUES (?, ?, 0)').run(interaction.user.id, task.id);
                }
            }
            else {
                for (const char of chars) {
                    const taskExists = db.prepare('SELECT * FROM checklist WHERE user_id = ? AND task_id = ? AND character_id = ?').get(interaction.user.id, task.id, char.id);
                    if (!taskExists) {
                        db.prepare('INSERT INTO checklist (user_id, character_id, task_id, completed) VALUES (?, ?, ?, 0)').run(interaction.user.id, char.id, task.id);
                    }
                }
            }
        }

        await interaction.reply(
            `Checklist updated!`,
        );
        
	},
};