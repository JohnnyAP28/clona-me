const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

const { cloneRoles } = require('../utils/cloneRoles');
const { cloneChannels } = require('../utils/cloneChannels');
const { cloneServerSettings } = require('../utils/cloneServerSettings');
const { cloneMessages } = require('../utils/cloneMessages');

// ── /clone ───────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('clone')
    .setDescription('Abre o painel de clonagem para copiar um servidor do Discord')
    .setDescriptionLocalizations({
      'en-US': 'Open the cloning panel to copy a Discord server',
    }),

  async execute(interaction) {
    // Verifica permissão de administrador
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({
        content: 'Você precisa de permissão de **Administrador** para usar este comando.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('clone_modal')
      .setTitle('Clona-Me — Clonar Servidor');

    const serverIdInput = new TextInputBuilder()
      .setCustomId('target_server_id')
      .setLabel('ID do Servidor Alvo')
      .setPlaceholder('Ex: 123456789012345678')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(17)
      .setMaxLength(20);

    const rolesInput = new TextInputBuilder()
      .setCustomId('clone_roles')
      .setLabel('Clonar Cargos?')
      .setPlaceholder('sim ou nao')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(3)
      .setValue('sim');

    const channelsInput = new TextInputBuilder()
      .setCustomId('clone_channels')
      .setLabel('Clonar Categorias e Canais (com permissões)?')
      .setPlaceholder('sim ou nao')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(3)
      .setValue('sim');

    const settingsInput = new TextInputBuilder()
      .setCustomId('clone_settings')
      .setLabel('Clonar Configurações do Servidor?')
      .setPlaceholder('sim ou nao')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(3)
      .setValue('sim');

    const messagesInput = new TextInputBuilder()
      .setCustomId('clone_messages')
      .setLabel('Clonar Mensagens?')
      .setPlaceholder('sim ou nao')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(3)
      .setValue('nao');

    modal.addComponents(
      new ActionRowBuilder().addComponents(serverIdInput),
      new ActionRowBuilder().addComponents(rolesInput),
      new ActionRowBuilder().addComponents(channelsInput),
      new ActionRowBuilder().addComponents(settingsInput),
      new ActionRowBuilder().addComponents(messagesInput),
    );

    await interaction.showModal(modal);
  },

  // ── Modal Submit Handler ─────────────────────────────
  async handleModal(interaction) {
    const targetServerId = interaction.fields.getTextInputValue('target_server_id').trim();
    const cloneRolesFlag = interaction.fields.getTextInputValue('clone_roles').toLowerCase() === 'sim';
    const cloneChannelsFlag = interaction.fields.getTextInputValue('clone_channels').toLowerCase() === 'sim';
    const cloneSettingsFlag = interaction.fields.getTextInputValue('clone_settings').toLowerCase() === 'sim';
    const cloneMessagesFlag = interaction.fields.getTextInputValue('clone_messages').toLowerCase() === 'sim';

    // Validação do ID
    if (!/^\d{17,20}$/.test(targetServerId)) {
      return interaction.reply({
        content: 'ID do servidor inválido. O ID deve ter entre 17 e 20 dígitos numéricos.',
        ephemeral: true,
      });
    }

    const destGuild = interaction.guild;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔄 Clonagem Iniciada')
          .setColor(0x5865f2)
          .setDescription(
            `**Servidor Alvo:** \`${targetServerId}\`\n` +
            `**Destino:** ${destGuild.name}\n\n` +
            `• Cargos: ${cloneRolesFlag ? '✅' : '❌'}\n` +
            `• Categorias e Canais: ${cloneChannelsFlag ? '✅' : '❌'}\n` +
            `• Configurações: ${cloneSettingsFlag ? '✅' : '❌'}\n` +
            `• Mensagens: ${cloneMessagesFlag ? '✅' : '❌'}\n\n` +
            `⏳ Iniciando o processo...`
          )
          .setFooter({ text: 'Clona-Me • Não feche o Discord' })
          .setTimestamp(),
      ],
    });

    try {
      const results = [];

      // 1. Cargos
      if (cloneRolesFlag) {
        const statusMsg = await interaction.followUp({ content: '🔄 **Clonando cargos...**', ephemeral: false });
        const roleResult = await cloneRoles(targetServerId, destGuild);
        results.push(`**Cargos:** ${roleResult.created} criados, ${roleResult.skipped} pulados, ${roleResult.errors} erros`);
        await statusMsg.delete().catch(() => {});
      }

      // 2. Categorias e Canais (com permissões)
      if (cloneChannelsFlag) {
        const statusMsg = await interaction.followUp({ content: '🔄 **Clonando categorias e canais...**', ephemeral: false });
        const channelResult = await cloneChannels(targetServerId, destGuild);
        results.push(`**Canais:** ${channelResult.created} criados, ${channelResult.errors} erros`);
        await statusMsg.delete().catch(() => {});
      }

      // 3. Configurações do servidor
      if (cloneSettingsFlag) {
        const statusMsg = await interaction.followUp({ content: '🔄 **Aplicando configurações do servidor...**', ephemeral: false });
        const settingsResult = await cloneServerSettings(targetServerId, destGuild);
        results.push(`**Configurações:** ${settingsResult.applied} aplicadas, ${settingsResult.errors} erros`);
        await statusMsg.delete().catch(() => {});
      }

      // 4. Mensagens
      if (cloneMessagesFlag) {
        const statusMsg = await interaction.followUp({ content: '🔄 **Clonando mensagens...** (isso pode demorar)', ephemeral: false });
        const msgResult = await cloneMessages(targetServerId, destGuild);
        results.push(`**Mensagens:** ${msgResult.cloned} mensagens clonadas, ${msgResult.errors} erros`);
        await statusMsg.delete().catch(() => {});
      }

      // Resumo final
      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Clonagem Concluída')
            .setColor(0x57f287)
            .setDescription(results.join('\n') || 'Nenhuma operação selecionada.')
            .setFooter({ text: 'Clona-Me • Servidor clonado com sucesso' })
            .setTimestamp(),
        ],
      });

    } catch (error) {
      console.error('[ERRO] Clonagem:', error);
      await interaction.followUp({
        content: `❌ **Erro durante a clonagem:**\n\`\`\`${error.message.slice(0, 1500)}\`\`\``,
        ephemeral: false,
      });
    }
  },
};
