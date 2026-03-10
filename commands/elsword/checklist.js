const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../../database.js');
const classes = require('../../classes.js');

/**
 * Create an embed wist of tasks based on completion for the user's in-game account
 * Create rows of 5 buttons at most for each task, green if completed, red if not
 * @param {*} userId - User's discord ID
 * @param {*} displayName - User's display name in the discord server
 * @param {*} avatar - User's profile picture
 * @returns 
 */
function checklistBuilder(userId, displayName, avatar) {
    const accountTasks = db.prepare("SELECT tasks.id, tasks.title, checklist.completed FROM tasks JOIN checklist ON tasks.id = checklist.task_id WHERE checklist.user_id = ? AND tasks.bound = 'account' AND checklist.character_id IS NULL")
    .all(userId);

    const embed = new EmbedBuilder().setTitle(`${displayName}'s Account Checklist`).setColor('#ff7b00').setThumbnail(avatar);
    const rows = [];

    let description = '';
    
    for (let i = 0; i < accountTasks.length; i++) {
        const task = accountTasks[i];
        description += `${task.completed ? '✅' : '❌'} ${task.title}\n\n`;

        if (i % 5 === 0) {
            rows.push(new ActionRowBuilder());
        }
        
        const button = new ButtonBuilder().setCustomId(task.id.toString()).setLabel(task.title).setStyle(task.completed ? ButtonStyle.Success : ButtonStyle.Danger);
        rows[rows.length - 1].addComponents(button);
    }

    embed.setDescription(description);

    return { embed, rows };
}

/**
 * Create an embed wist of tasks based on completion for the user's in-game selected character
 * Create rows of 5 buttons at most for each task, green if completed, red if not
 * @param {*} charId - User's character ID
 * @param {*} displayName - User's character name
 * @param {*} avatar - User's profile picture
 * @returns 
 */
function characterChecklistBuilder(charId, displayName, avatar) {
    const accountTasks = db.prepare("SELECT tasks.id, tasks.title, checklist.completed FROM tasks JOIN checklist ON tasks.id = checklist.task_id WHERE checklist.character_id = ? AND tasks.bound = 'character'")
    .all(charId);

    const embed = new EmbedBuilder().setTitle(`${displayName}'s Checklist`).setColor('#ff7b00').setThumbnail(avatar);
    const rows = [];

    let description = '';
    
    for (let i = 0; i < accountTasks.length; i++) {
        const task = accountTasks[i];
        description += `${task.completed ? '✅' : '❌'} ${task.title}\n\n`;

        if (i % 5 === 0) {
            rows.push(new ActionRowBuilder());
        }
        
        const button = new ButtonBuilder().setCustomId(task.id.toString()).setLabel(task.title).setStyle(task.completed ? ButtonStyle.Success : ButtonStyle.Danger);
        rows[rows.length - 1].addComponents(button);
    }

    embed.setDescription(description);

    return { embed, rows };
}

module.exports = {
	data: new SlashCommandBuilder()
    .setName('checklist')
    .setDescription('View to-do list and mark tasks as completed')
    .addBooleanOption(option =>
        option.setName('character')
        .setDescription('View to-do list per character')
        .setRequired(false)
    ),

	async execute(interaction) {
        // ? Verification: user needs to be registered and have synced their tasks previously
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to view your checklist!`, flags: MessageFlags.Ephemeral});
        }

        const hasChecklist = db.prepare('SELECT * FROM checklist WHERE user_id = ?').get(interaction.user.id);
        if (!hasChecklist) {
            return interaction.reply({ content: 'Use `/sync` first to see your checklist!' });
        }

        // ? Character Checklist ===============================================================================
        const usesCharacter = interaction.options.getBoolean('character');
        if (usesCharacter) {
            const userChars = db.prepare('SELECT id, name, class FROM characters WHERE user_id = ?').all(interaction.user.id);
            if (userChars.length === 0) {
                return interaction.reply({ content: 'Use /add-character first, your account is empty!', flags: MessageFlags.Ephemeral });
            }

            const userClasses = Object.values(classes).flat();
        
            const characterSelect = new StringSelectMenuBuilder()
            .setCustomId('chartasks')
            .setPlaceholder('Choose a character to view their checklist')
            .addOptions(
                userChars.map(char => {
                    const emote = userClasses.find(cls => cls.name === char.class).emote;
                    return new StringSelectMenuOptionBuilder()
                    .setLabel(char.name)
                    .setValue(char.name)
                    .setEmoji(emote)
                })
            );

            // ? Select character and their checklist
            let currentChar = null;
            let currentEmote = null;
            const characterRow = new ActionRowBuilder().addComponents(characterSelect);
            await interaction.reply({ components: [characterRow] });

            const collector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: i => i.customId === 'chartasks' && i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                currentChar = userChars.find(c => c.name === i.values[0]);
                currentEmote = userClasses.find(cls => cls.name === currentChar.class).emote;
                const { embed, rows } = characterChecklistBuilder(currentChar.id, `${currentEmote} ${currentChar.name}`, interaction.user.displayAvatarURL())
                await i.update({ embeds: [embed], components: [characterRow, ...rows] });

            });

            // ? Update checklist on button click
            const buttonCollector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            buttonCollector.on('collect', async i => {
                if (!currentChar) return;
                const id = parseInt(i.customId);
                db.prepare('UPDATE checklist SET completed = 1 - completed WHERE character_id = ? AND task_id = ?').run(currentChar.id, id);
                const { embed, rows } = characterChecklistBuilder(currentChar.id, `${currentEmote} ${currentChar.name}`, interaction.user.displayAvatarURL())
                await i.update({ embeds: [embed], components: [characterRow, ...rows] });
            })
        } else {
            // ? Account Checklist ===============================================================================
            const { embed, rows } = checklistBuilder(interaction.user.id, interaction.member.displayName, interaction.user.displayAvatarURL());
            await interaction.reply({ embeds: [embed], components: rows });
            
            const collector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });
            
            collector.on('collect', async i => {
                const id = parseInt(i.customId);
                db.prepare('UPDATE checklist SET completed = 1 - completed WHERE user_id = ? AND task_id = ?').run(interaction.user.id, id)
                const { embed, rows } = checklistBuilder(interaction.user.id, interaction.member.displayName, interaction.user.displayAvatarURL());
                await i.update({ embeds: [embed], components: rows });
            })
        }
	},
};