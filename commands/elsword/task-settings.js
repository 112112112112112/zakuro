const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../../database.js');
const classes = require('../../classes.js');

/**
 * Create an embed list of tasks based on if they are displayed in the checklist or not for the user's in-game selected character
 * Create rows of 5 buttons at most for each task, green if enabled, red if disabled
 * @param {*} charId - User's character ID
 * @param {*} displayName - User's character name
 * @param {*} avatar - User's profile picture
 * @returns 
 */
function settingsBuilder(charId, displayName, avatar) {
    const tasks = db.prepare(`SELECT tasks.id, tasks.title, checklist.enabled
        FROM tasks JOIN checklist ON tasks.id = checklist.task_id
        WHERE checklist.character_id = ? AND tasks.bound = 'character'`)
    .all(charId);

    const embed = new EmbedBuilder().setTitle(`${displayName}'s Task Settings`).setColor(Math.floor(Math.random() * 0xFFFFFF)).setThumbnail(avatar);
    const rows = [];

    let description = '';
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        description += `${task.enabled ? '✅' : '❌'} ${task.title}\n\n`;

        const rowIndex = Math.floor(i / 5);

        if (!rows[rowIndex]) {
            rows[rowIndex] = new ActionRowBuilder();
        }
        
        const button = new ButtonBuilder()
            .setCustomId(`toggle_${task.id.toString()}`)
            .setLabel(task.title)
            .setStyle(task.enabled ? ButtonStyle.Success : ButtonStyle.Danger);
        
        rows[rowIndex].addComponents(button);
    }

    embed.setDescription(description || 'No tasks were found for this character!');

    return { embed, rows };
}

module.exports = {
	data: new SlashCommandBuilder()
    .setName('task-settings')
    .setDescription('Enable or disable tasks per character'),

	async execute(interaction) {
        // ? Verification: user needs to be registered and have synced their tasks previously
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to change your task settings!`, flags: MessageFlags.Ephemeral});
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

        // ? Character Task Settings ===============================================================================
        const userChars = db.prepare('SELECT id, name, class FROM characters WHERE user_id = ?').all(interaction.user.id);
        if (userChars.length === 0) {
            return interaction.reply({ content: 'Use /add-character first, your account is empty!', flags: MessageFlags.Ephemeral });
        }

        const userClasses = Object.values(classes).flat();
    
        const characterSelect = new StringSelectMenuBuilder()
        .setCustomId('chartasks')
        .setPlaceholder('Choose a character to view their task settings')
        .addOptions(
            userChars.map(char => {
                const emote = userClasses.find(cls => cls.name === char.class).emote;
                return new StringSelectMenuOptionBuilder()
                .setLabel(char.name)
                .setValue(char.id.toString())
                .setEmoji(emote)
            })
        );

        // ? Select character and their task settings
        const row = new ActionRowBuilder().addComponents(characterSelect);
        
        const msg = await interaction.reply({
            components: [row],
            fetchReply: true
        });
        
        let currentChar = null;
        let currentEmote = null;

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.message.id === msg.id,
            time: 60000
        });

        collector.on('collect', async i => {
            currentChar = userChars.find(c => c.id === parseInt(i.values[0]));
            currentEmote = userClasses.find(cls => cls.name === currentChar.class).emote;
            const { embed, rows } = settingsBuilder(currentChar.id, `${currentEmote} ${currentChar.name}`, interaction.user.displayAvatarURL());
            await i.update({ embeds: [embed], components: [row, ...rows] });
        });

        // ? Update settings on button click
        const buttonCollector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id && i.message.id === msg.id,
            time: 60000
        });

        buttonCollector.on('collect', async i => {
            if (!i.customId.startsWith('toggle_')) return;
            if (!currentChar) {
                return i.reply({ content: 'You need to select a character first!', flags: MessageFlags.Ephemeral })
            };

            const id = parseInt(i.customId.split('_')[1]);
            db.prepare('UPDATE checklist SET enabled = 1 - enabled WHERE character_id = ? AND task_id = ?').run(currentChar.id, id);

            const { embed, rows } = settingsBuilder(currentChar.id, `${currentEmote} ${currentChar.name}`, interaction.user.displayAvatarURL());
            await i.update({ embeds: [embed], components: [row, ...rows] });
        })
	},
};