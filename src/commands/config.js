const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o bot: PIX, perfil, avatar, banner e descrição'),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({ content: 'Você precisa de permissão de **Administrador**.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configuração do Bot')
      .setColor(0x5865F2)
      .setDescription(
        `**PIX atual:** ${config.pixKey ? `\`${config.pixKey}\`` : '❌ Não configurado'}\n` +
        `**QR Code:** ${config.pixQrUrl ? '✅ Configurado' : '❌ Não configurado'}\n` +
        `**Descrição:** ${interaction.client.user?.presence?.activities?.[0]?.name || 'Padrão'}\n\n` +
        `**Link fixo do servidor:** https://discord.gg/hykfavEur\n\n` +
        `Use os botões abaixo para configurar.`
      )
      .setFooter({ text: 'Clona-Me • Configurações do bot' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('config_pix').setLabel('💳 PIX').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('config_desc').setLabel('📝 Descrição').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
  },
};
