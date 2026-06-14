const { SlashCommandBuilder } = require('discord.js');

// Polyfill fetch para Node.js < 18
async function fetchUrl(url) {
  if (typeof fetch !== 'undefined') {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }
  const mod = url.startsWith('https') ? require('node:https') : require('node:http');
  return new Promise((resolve, reject) => {
    mod.get(url, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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
      const text = await fetchUrl(attach.url);
      const backup = JSON.parse(text);
      const fs = require('node:fs');
      const path = require('node:path');
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir,{recursive:true});
      let restored = [];
      if (backup.panels) { fs.writeFileSync(path.join(dataDir,'panels.json'),JSON.stringify(backup.panels)); restored.push('Panéis'); }
      if (backup.config) { fs.writeFileSync(path.join(dataDir,'config.json'),JSON.stringify(backup.config)); restored.push('Config'); }
      if (backup.coupons) { fs.writeFileSync(path.join(dataDir,'coupons.json'),JSON.stringify(backup.coupons)); restored.push('Cupons'); }
      await interaction.followUp({content:`✅ **Restaurado:** ${restored.join(', ')||'Nada encontrado.'}\n⚠️ Reinicie o bot no Discloud para aplicar.`,ephemeral:true});
    } catch(e) { await interaction.followUp({content:`❌ Erro: ${e.message}`,ephemeral:true}); }
  },
};
