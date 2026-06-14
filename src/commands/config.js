const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o bot: PIX, avatar, banner e descrição'),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({ content: 'Você precisa de permissão de **Administrador**.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configuração do Bot')
      .setColor(0x5865F2)
      .setDescription(
        `**PIX:** ${config.pixKey ? `\`${config.pixKey.slice(0, 30)}...\`` : '❌ Não configurado'}\n` +
        `**QR Code PIX:** ${config.pixQrUrl ? '✅ Configurado' : '❌ Não configurado'}\n` +
        `**Avatar:** ${interaction.client.user?.avatar ? '✅ Personalizado' : 'Padrão'}\n` +
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

    await interaction.reply({ embeds: [embed], components: [r1], ephemeral: true });
  },
};
