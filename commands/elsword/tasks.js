const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder().setName('tasks').setDescription('Display all tasks'),
	async execute(interaction) {
        const embed = new EmbedBuilder().setTitle('Elsword Tasks').setColor('#DDFF00');
        
        const combinations = [
            { reset: 'daily', bound: 'account' },
            { reset: 'daily', bound: 'character' },
            { reset: 'weekly', bound: 'account' },
            { reset: 'weekly', bound: 'character' },
        ];

        let fieldCount = 0;

        for (const { reset, bound} of combinations) {
            const tasks = db.prepare('SELECT * FROM tasks WHERE reset = ? AND bound = ?').all(reset, bound);

            embed.addFields({
                name: `📑 ${reset.toUpperCase()} ${bound.toUpperCase()}`,
                value: tasks.length ? tasks.map(t => `✦ ${t.title}`).join('\n') : '',
                inline: true
            })

            fieldCount++;
            // * add spacer for 2x2 layout
            if (fieldCount === 2) {
                embed.addFields({ name: '', value: ''});
            }
        };

        await interaction.reply({ embeds: [embed] });
	},
};