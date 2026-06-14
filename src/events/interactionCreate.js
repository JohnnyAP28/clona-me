module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ── Slash Commands ──────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[ERRO] Comando não encontrado: ${interaction.commandName}`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[ERRO] ${interaction.commandName}:`, error);
        const reply = {
          content: 'Ocorreu um erro ao executar este comando.',
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }

    // ── Modal Submits ───────────────────────────────────
    if (interaction.isModalSubmit()) {
      // O customId do modal mapeia para o nome do COMANDO (setName), não o nome do arquivo
      const modalMap = {
        'clone_modal': 'clone',
        'clean_modal': 'resetar',   // ← CORRIGIDO: o comando se chama /resetar
      };

      const commandName = modalMap[interaction.customId];

      if (!commandName) {
        console.warn(`[AVISO] Modal desconhecido: ${interaction.customId}`);
        try {
          await interaction.reply({
            content: '❌ Formulário não reconhecido. Tente usar o comando novamente.',
            ephemeral: true,
          });
        } catch (_) {}
        return;
      }

      const command = interaction.client.commands.get(commandName);
      if (!command || !command.handleModal) {
        console.error(`[ERRO] Comando "${commandName}" não tem handleModal. Comandos disponíveis: ${[...interaction.client.commands.keys()].join(', ')}`);
        try {
          await interaction.reply({
            content: '❌ Erro interno. O comando não possui manipulador de formulário.',
            ephemeral: true,
          });
        } catch (_) {}
        return;
      }

      try {
        await command.handleModal(interaction);
      } catch (error) {
        console.error('[ERRO] Modal handle:', error);
        const reply = {
          content: 'Ocorreu um erro ao processar o formulário.',
          ephemeral: true,
        };
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        } catch (_) {
          // Interação expirou
        }
      }
    }
  },
};
