const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database.js');


module.exports = {
	data: new SlashCommandBuilder().setName('register').setDescription('Create an account'),
	async execute(interaction) {
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        
        if (!userExists) {
            db.prepare('INSERT INTO users(id) VALUES (?)').run(interaction.user.id);
            await interaction.reply(
                `Made an account succesfully!`,
            );
        } else {
            await interaction.reply(
                `You already have an account!`,
            );
        }
        
	},
};