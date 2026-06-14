const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Apaga mensagens do canal atual')
    .addIntegerOption(o => o.setName('quantidade').setDescription('Quantas mensagens apagar? (1-100)').setRequired(true)
      .setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({ content: '🔒 Apenas staff.', ephemeral: true });
    }

    const amount = interaction.options.getInteger('quantidade');
    const channel = interaction.channel;

    if (channel.type !== 0 && channel.type !== 'GUILD_TEXT') {
      return interaction.reply({ content: 'Use este comando em um canal de texto.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await channel.bulkDelete(amount, true);
      await interaction.followUp({ content: `🧹 ${messages.size} mensagem(ns) apagada(s).`, ephemeral: true });
    } catch (e) {
      await interaction.followUp({ content: `❌ Erro: ${e.message}`, ephemeral: true });
    }
  },
};
