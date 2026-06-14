const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createTicket, getTicketByChannel, closeTicket, getUserOpenTickets, listOpenTickets } = require('../utils/extrasManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de suporte via ticket')
    .addSubcommand(sub => sub.setName('abrir').setDescription('Abre um ticket de suporte')
      .addStringOption(o => o.setName('assunto').setDescription('Qual o motivo do ticket?').setRequired(true)))
    .addSubcommand(sub => sub.setName('fechar').setDescription('Fecha o ticket atual'))
    .addSubcommand(sub => sub.setName('listar').setDescription('Lista tickets abertos (staff)')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const isStaff = interaction.memberPermissions?.has('Administrator');

    if (sub === 'abrir') {
      const subject = interaction.options.getString('assunto');
      // Verifica se já tem ticket aberto
      const open = getUserOpenTickets(guild.id, interaction.user.id);
      if (open.length > 0) {
        const existing = guild.channels.cache.get(open[0].channelId);
        return interaction.reply({content:`Você já tem um ticket aberto: ${existing||'Canal não encontrado'}`,ephemeral:true});
      }

      // Cria canal privado
      let cat = guild.channels.cache.find(c => c.type===4 && c.name==='🎫・Tickets');
      if (!cat) cat = await guild.channels.create({name:'🎫・Tickets',type:4,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]}]});

      const ch = await guild.channels.create({name:`🎫・${interaction.user.username}-${subject.slice(0,20)}`,type:0,parent:cat.id,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},{id:guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ReadMessageHistory]}]});

      const ticket = createTicket(guild.id, interaction.user.id, ch.id);
      const embed = new EmbedBuilder().setTitle('🎫 Ticket #'+ticket.id).setColor(0x5865F2)
        .setDescription(`**Assunto:** ${subject}\n**Aberto por:** ${interaction.user}\n\nAguarde o atendimento da staff.`).setFooter({text:'Clona-Me • Suporte'}).setTimestamp();
      const btns = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket_close_${ticket.id}`).setLabel('🔒 Fechar').setStyle(ButtonStyle.Danger));
      await ch.send({content:`${interaction.user}`,embeds:[embed],components:[btns]});
      await interaction.reply({content:`✅ Ticket aberto: ${ch}`,ephemeral:true});
      return;
    }

    if (sub === 'fechar') {
      const ticket = getTicketByChannel(interaction.channel.id);
      if (!ticket) return interaction.reply({content:'Este canal não é um ticket.',ephemeral:true});
      const ct = closeTicket(ticket.id);
      if (!ct) return interaction.reply({content:'Erro ao fechar.',ephemeral:true});
      await interaction.reply({content:'🔒 Ticket fechado. Canal será deletado em 5s...'});
      setTimeout(async () => { try { await interaction.channel.delete('Ticket fechado'); } catch(_) {} }, 5000);
      return;
    }

    if (sub === 'listar') {
      if (!isStaff) return interaction.reply({content:'🔒 Apenas staff.',ephemeral:true});
      const openTickets = listOpenTickets(guild.id);
      if (!openTickets.length) return interaction.reply({content:'Nenhum ticket aberto.',ephemeral:true});
      const lines = openTickets.map(t => `<#${t.channelId}> — <@${t.userId}> — #${t.id}`).join('\n');
      await interaction.reply({content:`**🎫 Tickets abertos (${openTickets.length}):**\n${lines}`,ephemeral:true});
    }
  },
};
