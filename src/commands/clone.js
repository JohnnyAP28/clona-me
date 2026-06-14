const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

// ── Correção: visível apenas para primoracer ──
const CLONE_ALLOWED_USER = 'primoracer';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clone')
    .setDescription('Clona um servidor Discord completo'),

  async execute(interaction) {
    // Restrito ao dono
    if (interaction.user.username !== CLONE_ALLOWED_USER && interaction.user.tag !== CLONE_ALLOWED_USER) {
      return interaction.reply({
        content: '🔒 Este comando é restrito ao proprietário do bot.',
        ephemeral: true,
      });
    }

    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({ content: 'Você precisa de permissão de **Administrador**.', ephemeral: true });
    }

    // Resto do comando clone original...
    const modal = new (require('discord.js').ModalBuilder)()
      .setCustomId('clone_modal')
      .setTitle('⚠️ Clonar Servidor — Confirmação');

    const { TextInputBuilder, TextInputStyle } = require('discord.js');

    const targetInput = new TextInputBuilder()
      .setCustomId('clone_target')
      .setLabel('ID do servidor de origem')
      .setPlaceholder('123456789012345678')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(20);

    const confirmInput = new TextInputBuilder()
      .setCustomId('clone_confirm')
      .setLabel('Digite "CLONAR" para confirmar')
      .setPlaceholder('CLONAR')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(6)
      .setMaxLength(6);

    modal.addComponents(
      new (require('discord.js').ActionRowBuilder)().addComponents(targetInput),
      new (require('discord.js').ActionRowBuilder)().addComponents(confirmInput),
    );

    await interaction.showModal(modal);
  },
};
