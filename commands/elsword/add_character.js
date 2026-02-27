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

        const characterSelect = new StringSelectMenuBuilder()
        .setCustomId('character')
        .setPlaceholder('Choose your character')
        .addOptions(
            Object.keys(classes).map(char => new StringSelectMenuOptionBuilder()
            .setLabel(char)
            .setValue(char)
        ));

        const characterRow = new ActionRowBuilder().addComponents(characterSelect);

        await interaction.reply({ components: [characterRow] });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            max: 1,
            time: 15000
        });

        collector.on('collect', async i => {
            if (i.user.id === interaction.user.id) {
                const classSelect = new StringSelectMenuBuilder()
                .setCustomId('class')
                .setPlaceholder('Choose your class')
                .addOptions(
                    classes[i.values[0]].map(cls => new StringSelectMenuOptionBuilder()
                    .setLabel(cls.name)
                    .setValue(cls.name)
                    .setEmoji(cls.emote)
                ));

                const classRow = new ActionRowBuilder().addComponents(classSelect);
                await i.update({ components: [classRow] });

                const selectedChar = i.values[0];
                const classCollector = interaction.channel.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    max: 1,
                    time: 15000
                });

                classCollector.on('collect', async i => {
                    if (i.user.id === interaction.user.id) {
                        const selectedClass = classes[selectedChar].find(cls => cls.name === i.values[0]);
                        db.prepare('INSERT INTO characters (user_id, name, class) VALUES (?, ?, ?)').run(interaction.user.id, interaction.options.getString('name'), i.values[0]);

                        await i.update({ content: `Added character ${selectedClass.emote} ${interaction.options.getString('name')} to your account!`, components: [] });
                    }
                });



                classCollector.on('end', collected => {
                    if (collected.size !== 0) {
                        console.log(`Collected ${collected.size} interactions.`);
                    }
                })
            } else {
                i.reply({ content: `You didn't use this command!`, flags: MessageFlags.Ephemeral});
            }
        });
    },
};