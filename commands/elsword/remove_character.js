const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');
const classes = require('../../classes.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('remove-character')
    .setDescription('Remove a character from your account'),

    async execute(interaction) {
        // * Validation
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to remove a character!`, flags: MessageFlags.Ephemeral});
        }

        const userChars = db.prepare('SELECT name, class FROM characters WHERE user_id = ?').all(interaction.user.id);
        
        if (userChars.length === 0) {
            return interaction.reply({ content: 'Use /add-character first, your account is empty!' })
        }
        
        // * Remove a character
        const userClasses = Object.values(classes).flat();
        
        const characterSelect = new StringSelectMenuBuilder()
        .setCustomId('remove')
        .setPlaceholder('Choose a character to remove')
        .addOptions(
            userChars.map(char => {
                const emote = userClasses.find(cls => cls.name === char.class).emote;
                return new StringSelectMenuOptionBuilder()
                .setLabel(char.name)
                .setValue(char.name)
                .setEmoji(emote)
            })
        );

        const characterRow = new ActionRowBuilder().addComponents(characterSelect);
        await interaction.reply({ components: [characterRow] });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.customId === 'remove' && i.user.id === interaction.user.id,
            max: 1,
            time: 60000
        });

        collector.on('collect', async i => {
            const char = userChars.find(c => c.name === i.values[0]);
            const emote = userClasses.find(cls => cls.name === char.class).emote;
            db.prepare('DELETE FROM characters WHERE user_id = ? AND name = ?').run(interaction.user.id, i.values[0]);
            await i.update({ content: `Removed character ${emote} ${char.name} from your account!`, components: [] });
        });
        
    },
};