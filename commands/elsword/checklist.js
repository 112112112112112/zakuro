const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType } = require('discord.js');
const db = require('../../database.js');

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

module.exports = {
	data: new SlashCommandBuilder().setName('checklist').setDescription('View to-do list and mark tasks as completed'),
	async execute(interaction) {
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to view your checklist!`, flags: MessageFlags.Ephemeral});
        }

        const hasChecklist = db.prepare('SELECT * FROM checklist WHERE user_id = ?').get(interaction.user.id);
        if (!hasChecklist) {
            return interaction.reply({ content: 'Use `/sync` first to see your checklist!' });
        }

        const { embed, rows } = checklistBuilder(interaction.user.id, interaction.member.displayName, interaction.user.displayAvatarURL());
        await interaction.reply({ embeds: [embed], components: rows });

        const collector = interaction.channel.createMessageComponentCollector({
            ComponentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const id = parseInt(i.customId);
            db.prepare('UPDATE checklist SET completed = 1 - completed WHERE user_id = ? AND task_id = ?').run(interaction.user.id, id)
            const { embed, rows } = checklistBuilder(interaction.user.id, interaction.member.displayName, interaction.user.displayAvatarURL());
            await i.update({ embeds: [embed], components: rows });
        })
	},
};