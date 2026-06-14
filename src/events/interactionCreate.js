module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ═══ SLASH COMMANDS ═══
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) {
        console.error(`[ERRO] Comando não encontrado: ${interaction.commandName}`);
        return;
      }
      try {
        await cmd.execute(interaction);
      } catch (e) {
        console.error(`[ERRO] ${interaction.commandName}:`, e.message, e.stack?.split('\n').slice(0,3).join('\n'));
        const reply = { content: `❌ Erro: ${e.message.slice(0, 1500)}`, ephemeral: true };
        try {
          if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
          else await interaction.reply(reply);
        } catch (_) {}
      }
      return;
    }
  },
};
