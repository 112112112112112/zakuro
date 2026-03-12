const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			const channel = await interaction.client.channels.fetch('1426625638483103966');
			const errorLogs = `<@828784032011124767> ${interaction.user.tag} tried to run ${interaction.commandName} but it failed.\nError message:\n\`\`\`js\n${error.stack}\n\`\`\``;
			const errorMsg = errorLogs.length > 2000 ? errorLogs.substring(0, 1997) + '...' : errorLogs;
			await channel.send(errorMsg);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};