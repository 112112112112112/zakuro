const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');
const classes = require('../../classes.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('edit-character')
    .setDescription('Edit a character from your account')
    .addStringOption((option) => option.setName('name').setDescription('Current character name').setRequired(true))
    .addStringOption((option) => option.setName('new-name').setDescription('New character name').setRequired(true)),

    async execute(interaction) {
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to edit a character!`, flags: MessageFlags.Ephemeral});
        }

        const oldName = interaction.options.getString('name');
        const newName = interaction.options.getString('new-name');

        const character = db.prepare('SELECT * FROM characters WHERE name = ? AND user_id = ?').get(oldName, interaction.user.id);
        const newNameExists = db.prepare('SELECT * FROM characters WHERE name = ? AND user_id = ?').get(newName, interaction.user.id);

        if (!character) {
            return interaction.reply({ content: `You don't have a character with that name!`, flags: MessageFlags.Ephemeral })
        }

        if (newNameExists) {
            return interaction.reply({ content: `You already have a character with that name!`, flags: MessageFlags.Ephemeral })
        }

        const charClasses = classes[character.base_character];

        const classSelect = new StringSelectMenuBuilder()
            .setCustomId('class')
            .setPlaceholder('Choose your class')
            .addOptions(
            charClasses.map(cls =>
            new StringSelectMenuOptionBuilder()
                .setLabel(cls.name)
                .setValue(cls.name)
                .setEmoji(cls.emote)
            )
        );
        
        const classRow = new ActionRowBuilder().addComponents(classSelect);

        const msg = await interaction.reply({
            content: `*Editing character from ${oldName} to ${newName}*`,
            components: [classRow],
            fetchReply: true
        });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.customId === 'class' && i.user.id === interaction.user.id && i.message.id === msg.id,
            max: 1,
            time: 60000
        });

        collector.on('collect', async i => {
            const selectedClass = charClasses.find(cls => cls.name === i.values[0]);
            db.prepare('UPDATE characters SET name = ?, class = ? WHERE user_id = ? AND name = ?').run(newName, selectedClass.name, interaction.user.id, oldName);

            await i.update({ content: `Edited character ${selectedClass.emote} ${newName}!`, components: [] })
        });
    },
};