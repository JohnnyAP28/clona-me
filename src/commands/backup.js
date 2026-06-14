const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Exporta painéis e configurações para backup'),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) return interaction.reply({content:'🔒 Apenas staff.',ephemeral:true});
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const panelsPath = path.join(dataDir,'panels.json');
      const configPath = path.join(dataDir,'config.json');
      const couponsPath = path.join(dataDir,'coupons.json');

      const backup = {
        panels: fs.existsSync(panelsPath) ? JSON.parse(fs.readFileSync(panelsPath,'utf-8')) : null,
        config: fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath,'utf-8')) : null,
        coupons: fs.existsSync(couponsPath) ? JSON.parse(fs.readFileSync(couponsPath,'utf-8')) : null,
        exportedAt: new Date().toISOString(),
      };

      const buffer = Buffer.from(JSON.stringify(backup, null, 2), 'utf-8');
      try {
        await interaction.user.send({ content: '📦 **Backup do Clona-Me**', files: [{ attachment: buffer, name: `clona-me-backup-${Date.now()}.json` }] });
        await interaction.reply({ content: '✅ Backup enviado no seu DM!', ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: '❌ Não foi possível enviar DM. Verifique se suas DMs estão abertas.', ephemeral: true });
      }
    } catch(e) {
      await interaction.reply({ content: `❌ Erro: ${e.message}`, ephemeral: true });
    }
  },
};
