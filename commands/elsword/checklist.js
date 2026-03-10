const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');


module.exports = {
	data: new SlashCommandBuilder().setName('checklist').setDescription('View to-do list and mark tasks as completed'),
	async execute(interaction) {
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to view your checklist!`, flags: MessageFlags.Ephemeral});
        }

        const accountTasks = db.prepare("SELECT tasks.id, tasks.title, checklist.completed FROM tasks JOIN checklist ON tasks.id = checklist.task_id WHERE checklist.user_id = ? AND tasks.bound = 'account' AND checklist.character_id IS NULL")
        .all(interaction.user.id);

        const embed = new EmbedBuilder().setTitle(`${interaction.member.displayName}'s Account Checklist`).setColor('#ff7b00');
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

        await interaction.reply({ embeds: [embed], components: rows });

        
	},
};