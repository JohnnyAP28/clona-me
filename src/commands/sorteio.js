const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createRaffle, joinRaffle, drawRaffle, getRaffle, listActiveRaffles } = require('../utils/extrasManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Sistema de sorteios')
    .addSubcommand(sub => sub.setName('criar').setDescription('Cria um sorteio')
      .addChannelOption(o => o.setName('canal').setDescription('Canal do sorteio').setRequired(true))
      .addStringOption(o => o.setName('premio').setDescription('Nome do prêmio').setRequired(true))
      .addIntegerOption(o => o.setName('minutos').setDescription('Duração em minutos').setRequired(true))
      .addIntegerOption(o => o.setName('ganhadores').setDescription('Quantos ganhadores? (padrão: 1)').setRequired(false)))
    .addSubcommand(sub => sub.setName('encerrar').setDescription('Encerra e sorteia (staff)')
      .addIntegerOption(o => o.setName('id').setDescription('ID do sorteio').setRequired(true)))
    .addSubcommand(sub => sub.setName('ativos').setDescription('Lista sorteios ativos')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const isStaff = interaction.memberPermissions?.has('Administrator');

    if (sub === 'criar') {
      if (!isStaff) return interaction.reply({content:'🔒 Apenas staff.',ephemeral:true});
      const channel = interaction.options.getChannel('canal');
      const prize = interaction.options.getString('premio');
      const minutes = interaction.options.getInteger('minutos');
      const winners = interaction.options.getInteger('ganhadores') || 1;
      const r = createRaffle(interaction.guildId, channel.id, prize, winners, minutes, interaction.user.id);

      const embed = new EmbedBuilder().setTitle('🎉 Sorteio!').setColor(0xF0B232)
        .setDescription(`**Prêmio:** ${prize}\n**Ganhadores:** ${winners}\n**Termina:** <t:${Math.floor((Date.now()+minutes*60000)/1000)}:R>\n**Participantes:** 0`)
        .setFooter({text:`ID: ${r.id} • Clique no botão para participar`});
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`raffle_join_${r.id}`).setLabel('🎟️ Participar').setStyle(ButtonStyle.Success));
      const msg = await channel.send({embeds:[embed],components:[btn]});

      setTimeout(async () => {
        const result = drawRaffle(r.id);
        if (!result) return;
        const winnerText = result.winners.length ? result.winners.map(w=>`<@${w}>`).join(', ') : 'Nenhum participante.';
        const endEmbed = new EmbedBuilder().setTitle('🎉 Sorteio Encerrado!').setColor(0x57f287)
          .setDescription(`**Prêmio:** ${result.prize}\n**Ganhador(es):** ${winnerText}\n**Total participantes:** ${result.participants.length}`).setFooter({text:`ID: ${r.id}`});
        try { await msg.edit({embeds:[endEmbed],components:[]}); } catch(_) {}
      }, minutes*60000);

      await interaction.reply({content:`✅ Sorteio #${r.id} criado em ${channel}. Duração: ${minutes}min.`,ephemeral:true});
    } else if (sub === 'encerrar') {
      if (!isStaff) return interaction.reply({content:'🔒 Apenas staff.',ephemeral:true});
      const id = interaction.options.getInteger('id');
      const result = drawRaffle(id);
      if (!result) return interaction.reply({content:'Sorteio não encontrado ou já encerrado.',ephemeral:true});
      const winnerText = result.winners.length ? result.winners.map(w=>`<@${w}>`).join(', ') : 'Nenhum participante.';
      await interaction.reply({content:`🎉 Sorteio #${id} encerrado!\nGanhador(es): ${winnerText}\nParticipantes: ${result.participants.length}`});
    } else if (sub === 'ativos') {
      const active = listActiveRaffles(interaction.guildId);
      if (!active.length) return interaction.reply({content:'Nenhum sorteio ativo.',ephemeral:true});
      const lines = active.map(r => `#${r.id} — ${r.prize} — ${r.participants.length} participantes — <#${r.channelId}>`).join('\n');
      await interaction.reply({content:`**🎉 Sorteios ativos:**\n${lines}`,ephemeral:true});
    }
  },
};
