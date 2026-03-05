const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const classes = require('../../classes.js');
const db = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder().setName('characters').setDescription('Display all characters in your account'),
	async execute(interaction) {
        const embed = new EmbedBuilder().setTitle(`${interaction.member.displayName}'s Characters`).setColor(Math.floor(Math.random() * 0xFFFFFF));
        const allCharacters = db.prepare('SELECT name, class FROM characters WHERE user_id = ?').all(interaction.user.id);
        
        if (allCharacters.length === 0) {
            return interaction.reply({ content: 'Use /add-character first, your account is empty!' })
        }
        
        const allClasses = Object.values(classes).flat();
        let description = '';

        for (const char of allCharacters) {
            const emote = allClasses.find(cls => cls.name === char.class).emote;
            description += `${emote} ${char.name}\n`;
        };

        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
	},
};