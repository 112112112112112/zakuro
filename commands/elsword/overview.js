const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const classes = require('../../classes.js');

module.exports = {
	data: new SlashCommandBuilder()
    .setName('overview')
    .setDescription('Display a simplified list tasks for all characters'),

	async execute(interaction) {
        // ? Verification: user needs to be registered and have synced their tasks previously
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register first!`, flags: MessageFlags.Ephemeral});
        }

        const hasChecklist = db.prepare('SELECT * FROM checklist WHERE user_id = ? AND character_id IS NULL').get(interaction.user.id);
        if (!hasChecklist) {
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
        }

        // ? Overview ===============================================================================
        const embed = new EmbedBuilder().setTitle(`${interaction.member.displayName}'s Overview`).setColor(Math.floor(Math.random() * 0xFFFFFF)).setThumbnail(interaction.user.displayAvatarURL());
        const userChars = db.prepare('SELECT name, class FROM characters WHERE user_id = ?').all(interaction.user.id);
        if (userChars.length === 0) {
            return interaction.reply({ content: 'Use /add-character first, your account is empty!', flags: MessageFlags.Ephemeral });
        }

        let description = '';
        const userClasses = Object.values(classes).flat();
        const query = `SELECT characters.class, characters.name, tasks.title, checklist.completed
                        FROM characters JOIN checklist ON characters.id = checklist.character_id JOIN tasks ON tasks.id = checklist.task_id
                        WHERE checklist.user_id = ? AND tasks.title IN ('Doom Aporia', 'Challenge Mode', 'x10 Spirit Lord''s Temple')`;
        const overviewList = db.prepare(query).all(interaction.user.id)

        const chars = {};
        for (const row of overviewList) {
            if (!chars[row.name]) {
                const emote = userClasses.find(cls => cls.name === row.class).emote;
                chars[row.name] = { emote, tasks: [] };
            }
            chars[row.name].tasks.push(row);
        }

        for (const [name, data] of Object.entries(chars)) {
            description += `${data.emote} **${name}**\n`
            for (const task of data.tasks) {
                description += `${task.completed ? '✅' : '❌'} ${task.title}\n`;
            }
            description += '\n';
        }

        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
	},
};