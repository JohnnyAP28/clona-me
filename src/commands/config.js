const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o bot: PIX, avatar, banner, logs, cargo de cliente e descrição'),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({ content: 'Você precisa de permissão de **Administrador**.', ephemeral: true });
    }

    const logCh = config.logChannelId ? `<#${config.logChannelId}>` : '❌ Não configurado';
    const customerRole = config.customerRoleId ? `<@&${config.customerRoleId}>` : '❌ Não configurado';

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configuração do Bot')
      .setColor(0x5865F2)
      .setDescription(
        `**PIX:** ${config.pixKey ? `\`${config.pixKey.slice(0,30)}...\`` : '❌ Não configurado'}\n` +
        `**QR Code:** ${config.pixQrUrl ? '✅ Configurado' : '❌ Não configurado'}\n` +
        `**Logs de Vendas:** ${logCh}\n` +
        `**Cargo Cliente:** ${customerRole}\n` +
        `**Link do servidor:** ${config.serverInvite}\n\n` +
        `Use os botões abaixo.`
      )
      .setFooter({ text: 'Clona-Me • /config' });

    const r1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('config_pix').setLabel('💳 PIX').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('config_avatar').setLabel('🖼️ Avatar').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('config_banner').setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('config_desc').setLabel('📝 Descrição').setStyle(ButtonStyle.Secondary),
    );
    const r2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('config_logchannel').setLabel('📋 Log Vendas').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('config_customerrole').setLabel('👤 Cargo Cliente').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [r1, r2], ephemeral: true });
  },
};
