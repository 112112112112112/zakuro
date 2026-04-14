const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, MessageFlags } = require('discord.js');
const classes = require('../../classes.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('add-character')
    .setDescription('Add a character to your account')
    .addStringOption((option) => option.setName('name').setDescription('Character name').setRequired(true)),

    async execute(interaction) {
        const userExists = db.prepare('SELECT * FROM users WHERE id = ?').get(interaction.user.id);
        if (!userExists) {
            return interaction.reply({ content: `Make an account using /register before trying to add a character!`, flags: MessageFlags.Ephemeral});
        }

        const name = interaction.options.getString('name');
        const nameExists = db.prepare('SELECT * FROM characters WHERE name = ? AND user_id = ?').get(name, interaction.user.id);
        if (nameExists) {
            return interaction.reply({ content: `You already have a character with that name!`, flags: MessageFlags.Ephemeral});
        }

        const characterSelect = new StringSelectMenuBuilder()
        .setCustomId('character')
        .setPlaceholder('Choose your character')
        .addOptions(
            Object.keys(classes).map(char => new StringSelectMenuOptionBuilder()
            .setLabel(char)
            .setValue(char)
        ));

        const characterRow = new ActionRowBuilder().addComponents(characterSelect);
        const msg = await interaction.reply({ components: [characterRow], fetchReply: true });
        let selectedChar = null;

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.message.id === msg.id,
            max: 2,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'character') {
                selectedChar = i.values[0];

                const classSelect = new StringSelectMenuBuilder()
                .setCustomId('class')
                .setPlaceholder('Choose your class')
                .addOptions(
                    classes[selectedChar].map(cls => new StringSelectMenuOptionBuilder()
                    .setLabel(cls.name)
                    .setValue(cls.name)
                    .setEmoji(cls.emote)
                ));

                const classRow = new ActionRowBuilder().addComponents(classSelect);
                return await i.update({ components: [classRow] });
            }

            if (i.customId === 'class') {
                const selectedClass = classes[selectedChar].find(cls => cls.name === i.values[0]);
                db.prepare(
                    `INSERT INTO characters (user_id, name, class, base_character)
                    VALUES (?, ?, ?, ?)`
                ).run(interaction.user.id, name, selectedClass.name, selectedChar);

                collector.stop();

                return await i.update({ content: `Added character ${selectedClass.emote} ${name} to your account!`, components: [] });
            }
        });
    },
};