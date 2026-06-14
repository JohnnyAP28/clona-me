const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { cleanServer } = require('../utils/cleanServer');

// ── /resetar ────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetar')
    .setDescription('Restaura o servidor ao padrão de fábrica (apaga tudo e redefine nome e ícone)'),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({
        content: 'Você precisa de permissão de **Administrador** para usar este comando.',
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({
        content: 'Este comando só pode ser usado dentro de um servidor.',
        ephemeral: true,
      });
    }

    const roleCount = guild.roles.cache.filter(r => r.name !== '@everyone' && !r.managed).size;
    const channelCount = guild.channels.cache.size;
    const categoryCount = guild.channels.cache.filter(c => c.type === 4).size;

    const modal = new ModalBuilder()
      .setCustomId('clean_modal')
      .setTitle('Limpar Servidor — Confirmação');

    const warningInput = new TextInputBuilder()
      .setCustomId('clean_confirm')
      .setLabel('Digite "CONFIRMO" para apagar tudo')
      .setPlaceholder('CONFIRMO')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(8)
      .setMaxLength(8);

    const noteInput = new TextInputBuilder()
      .setCustomId('clean_note')
      .setLabel('Serão apagados:')
      .setPlaceholder(`${roleCount} cargos, ${channelCount} canais (${categoryCount} categorias)`)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100)
      .setValue(`${roleCount} cargos, ${channelCount} canais, ${categoryCount} categorias`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(warningInput),
      new ActionRowBuilder().addComponents(noteInput),
    );

    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error('[ERRO] Falha ao mostrar modal /resetar:', err);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Erro ao abrir o formulário. Tente novamente.', ephemeral: true });
      }
    }
  },

  async handleModal(interaction) {
    try {
      const confirmation = interaction.fields.getTextInputValue('clean_confirm').trim();

      if (confirmation !== 'CONFIRMO') {
        return interaction.reply({
          content: 'Operação cancelada. Você precisa digitar **CONFIRMO** exatamente como pedido.',
          ephemeral: true,
        });
      }

      const destGuild = interaction.guild;
      if (!destGuild) {
        return interaction.reply({ content: 'Servidor não encontrado.', ephemeral: true });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🧹 Limpeza Iniciada')
            .setColor(0xf0b232)
            .setDescription(
              `**Servidor:** ${destGuild.name}\n\n` +
              `⏳ Apagando cargos, canais e categorias...\n` +
              `⏳ Restaurando nome, ícone e canal de comandos...`
            )
            .setFooter({ text: 'Clona-Me • Isso pode levar alguns minutos' })
            .setTimestamp(),
        ],
      });

      try {
        const result = await cleanServer(destGuild);

        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ Servidor Restaurado')
              .setColor(0x57f287)
              .setDescription(
                `**Nome:** ${result.name}\n` +
                `**Ícone:** ${result.iconSet ? '✅ Restaurado' : '⚠️ Não foi possível aplicar'}\n` +
                `**Canal Fábrica:** ${result.factoryChannelCreated ? '✅ Criado (💻・Comandos > ⌨️・comandos)' : '⚠️ Não criado'}\n\n` +
                `• ${result.rolesDeleted} cargos removidos\n` +
                `• ${result.channelsDeleted} canais/categorias removidos\n` +
                `• ${result.errors} erros`
              )
              .setFooter({ text: 'Clona-Me • Servidor restaurado ao padrão de fábrica' })
              .setTimestamp(),
          ],
        });
      } catch (error) {
        console.error('[ERRO] Limpeza:', error);
        await interaction.followUp({
          content: `❌ **Erro durante a limpeza:**\n\`\`\`${error.message.slice(0, 1500)}\`\`\``,
          ephemeral: false,
        });
      }
    } catch (err) {
      console.error('[ERRO] Modal /resetar:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Algo deu errado ao processar o formulário. Tente novamente.', ephemeral: true });
        } else {
          await interaction.followUp({ content: 'Algo deu errado ao processar o formulário. Tente novamente.', ephemeral: true });
        }
      } catch (_) {}
    }
  },
};
