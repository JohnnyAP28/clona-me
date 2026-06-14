const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listCoupons, deleteCoupon, createCoupon } = require('../utils/extrasManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cupom')
    .setDescription('Gerencia cupons de desconto')
    .addSubcommand(sub => sub.setName('criar').setDescription('Cria um cupom')
      .addStringOption(o => o.setName('codigo').setDescription('Código do cupom').setRequired(true))
      .addNumberOption(o => o.setName('desconto').setDescription('% de desconto (ex: 10 = 10%)').setRequired(true))
      .addIntegerOption(o => o.setName('usos').setDescription('Máximo de usos (0 = ilimitado)').setRequired(false)))
    .addSubcommand(sub => sub.setName('listar').setDescription('Lista todos os cupons'))
    .addSubcommand(sub => sub.setName('deletar').setDescription('Deleta um cupom')
      .addStringOption(o => o.setName('codigo').setDescription('Código do cupom').setRequired(true))),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) return interaction.reply({content:'🔒 Apenas staff.',ephemeral:true});
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      const code = interaction.options.getString('codigo');
      const discount = interaction.options.getNumber('desconto');
      const uses = interaction.options.getInteger('usos') || 0;
      try {
        const c = createCoupon(code, discount, uses, null);
        await interaction.reply({content:`✅ Cupom **${c.code}** criado!\nDesconto: ${c.discount}%\nUsos: ${c.maxUses||'Ilimitado'}`,ephemeral:true});
      } catch(e) { await interaction.reply({content:`❌ Erro: ${e.message}`,ephemeral:true}); }
    } else if (sub === 'listar') {
      const coupons = listCoupons();
      if (!coupons.length) return interaction.reply({content:'Nenhum cupom cadastrado.',ephemeral:true});
      const embed = new EmbedBuilder().setTitle('🎟️ Cupons').setColor(0xF0B232);
      for (const c of coupons) embed.addFields({name:c.code,value:`${c.discount}% off • ${c.uses}/${c.maxUses||'∞'} usos`,inline:true});
      await interaction.reply({embeds:[embed],ephemeral:true});
    } else if (sub === 'deletar') {
      const code = interaction.options.getString('codigo');
      const ok = deleteCoupon(code);
      await interaction.reply({content:ok?`🗑️ Cupom ${code} deletado.`:`❌ Cupom ${code} não encontrado.`,ephemeral:true});
    }
  },
};
