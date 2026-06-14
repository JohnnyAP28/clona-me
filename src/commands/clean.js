const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { cleanServer } = require('../utils/cleanServer');

module.exports = {
  data: new SlashCommandBuilder().setName('resetar').setDescription('Restaura o servidor ao padrão de fábrica'),
  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) return interaction.reply({ content: '🔒 Staff.', ephemeral: true });
    const guild = interaction.guild; if (!guild) return interaction.reply({ content: 'Apenas em servidores.', ephemeral: true });
    const roleCount = guild.roles.cache.filter(r => r.name !== '@everyone' && !r.managed).size;
    const channelCount = guild.channels.cache.size;
    const categoryCount = guild.channels.cache.filter(c => c.type === 4).size;
    const modal = new ModalBuilder().setCustomId('clean_modal').setTitle('⚠️ Limpar Servidor — Confirmação');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('clean_confirm').setLabel('Digite "CONFIRMO" para apagar').setPlaceholder('CONFIRMO').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(8).setMaxLength(8)));
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('clean_note').setLabel('Serão apagados:').setPlaceholder(`${roleCount} cargos, ${channelCount} canais`).setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100).setValue(`${roleCount} cargos, ${channelCount} canais, ${categoryCount} categorias`)));
    try { await interaction.showModal(modal); } catch (e) { await interaction.reply({ content: 'Erro ao abrir formulário.', ephemeral: true }); }
  },
  async handleModal(interaction) {
    try {
      const c = interaction.fields.getTextInputValue('clean_confirm').trim(); if (c !== 'CONFIRMO') return interaction.reply({ content: '❌ Cancelado.', ephemeral: true });
      const g = interaction.guild; if (!g) return interaction.reply({ content: 'Servidor não encontrado.', ephemeral: true });
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧹 Limpeza Iniciada').setColor(0xf0b232).setDescription(`**${g.name}**\n⏳ Removendo canais, cargos, categorias...`).setFooter({ text: 'PRiMOBOT' }).setTimestamp()] });
      try {
        const r = await cleanServer(g);
        await interaction.followUp({ embeds: [new EmbedBuilder().setTitle('✅ Servidor Restaurado').setColor(0x57f287).setDescription(`**Nome:** ${r.name}\n**Ícone:** ${r.iconSet ? '✅' : '⚠️'}\n**Canal:** ${r.factoryChannelCreated ? '✅ 💻・Comandos' : '⚠️'}\n\n• ${r.rolesDeleted} cargos\n• ${r.channelsDeleted} canais\n• ${r.errors} erros`).setFooter({ text: 'PRiMOBOT' }).setTimestamp()] });
      } catch (e) { console.error('[RESET]', e); await interaction.followUp({ content: `❌ Erro: ${e.message}` }); }
    } catch (e) { console.error('[RESET modal]', e); try { if (!interaction.replied) await interaction.reply({ content: 'Erro no formulário.', ephemeral: true }); } catch (_) { } }
  },
};
