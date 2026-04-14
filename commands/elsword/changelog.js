const { SlashCommandBuilder } = require('discord.js');
const { execSync } = require('child_process');

module.exports = {
	data: new SlashCommandBuilder().setName('changelog').setDescription('Display latest bot updates'),
	async execute(interaction) {
        // ? (YYYY-MM-DD) Commit message
        const log = execSync('git log -10 --no-merges --pretty=format:"(%ad) %s" --date=short').toString();

        await interaction.reply(`Here are the latest bot updates:\n\n${log}`);
	},
};