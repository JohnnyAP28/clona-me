const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listPanels } = require('../utils/sellManager');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compras')
    .setDescription('Histórico de compras')
    .addUserOption(o => o.setName('usuario').setDescription('(Staff) Ver compras de um usuário').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const isStaff = interaction.memberPermissions?.has('Administrator');
    if (target.id !== interaction.user.id && !isStaff) return interaction.reply({content:'🔒 Apenas staff.',ephemeral:true});

    const guildId = interaction.guildId;
    const allPanels = listPanels(guildId).filter(p => p.soldCount > 0);

    // Busca vendas nos painéis e logs
    const PURCHASES_FILE = path.join(__dirname,'..','..','data','purchases.json');
    let purchaseLog = [];
    try { if(fs.existsSync(PURCHASES_FILE)) purchaseLog = JSON.parse(fs.readFileSync(PURCHASES_FILE,'utf-8')); } catch(_) {}

    const userPurchases = purchaseLog.filter(p => p.buyerId === target.id);

    const embed = new EmbedBuilder().setTitle(`🛒 Histórico — ${target.username}`).setColor(0x5865F2);
    let desc = '';

    if (userPurchases.length > 0) {
      desc += `**${userPurchases.length} compra(s) registrada(s):**\n\n`;
      for (const p of userPurchases.slice(-10)) {
        desc += `• **${p.productName}** — R$ ${p.price}\n  <t:${Math.floor(new Date(p.date).getTime()/1000)}:R> • Staff: <@${p.staffId}>\n\n`;
      }
    } else {
      desc += 'Nenhuma compra registrada ainda.';
      if (allPanels.some(p => p.soldCount > 0)) {
        desc += '\n⚠️ O histórico detalhado foi ativado recentemente. Compras anteriores não aparecem.';
      }
    }

    embed.setDescription(desc.slice(0,4000));
    await interaction.reply({embeds:[embed],ephemeral:target.id===interaction.user.id?false:true});
  },
};
