const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restaurar')
    .setDescription('Restaura painéis, config e cupons de um backup')
    .addAttachmentOption(o => o.setName('arquivo').setDescription('Arquivo JSON do backup').setRequired(false)),

  async execute(interaction) {
    if (interaction.user.username !== 'primoracer') return interaction.reply({content:'🔒 Restrito ao proprietário.',ephemeral:true});

    const attach = interaction.options.getAttachment('arquivo');
    if (!attach) return interaction.reply({content:'Anexe o arquivo `.json` do backup.',ephemeral:true});
    if (!attach.name.endsWith('.json')) return interaction.reply({content:'O arquivo precisa ser `.json`.',ephemeral:true});

    await interaction.deferReply({ephemeral:true});
    try {
      const res = await fetch(attach.url);
      const text = await res.text();
      const backup = JSON.parse(text);

      const fs = require('node:fs');
      const path = require('node:path');
      const dataDir = path.join(__dirname,'..','..','data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir,{recursive:true});

      let restored = [];
      if (backup.panels) { fs.writeFileSync(path.join(dataDir,'panels.json'),JSON.stringify(backup.panels,null,2)); restored.push('Panéis'); }
      if (backup.config) { fs.writeFileSync(path.join(dataDir,'config.json'),JSON.stringify(backup.config,null,2)); restored.push('Config'); }
      if (backup.coupons) { fs.writeFileSync(path.join(dataDir,'coupons.json'),JSON.stringify(backup.coupons,null,2)); restored.push('Cupons'); }

      await interaction.followUp({content:`✅ **Restaurado:** ${restored.join(', ') || 'Nada encontrado no backup.'}\n\n⚠️ Reinicie o bot no Discloud para aplicar as mudanças completamente.`,ephemeral:true});
    } catch(e) {
      await interaction.followUp({content:`❌ Erro: ${e.message}`,ephemeral:true});
    }
  },
};
