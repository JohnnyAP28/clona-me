module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
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

    if (interaction.isModalSubmit()) {
      const modalMap = {
        clone_modal: 'clone',
        clean_modal: 'clean',
      };

      const commandName = modalMap[interaction.customId];
      if (commandName) {
        const command = interaction.client.commands.get(commandName);
        if (command && command.handleModal) {
          try {
            await command.handleModal(interaction);
          } catch (error) {
            console.error('[ERRO] Modal handle:', error);
            const reply = {
              content: 'Ocorreu um erro ao processar o formulário.',
              ephemeral: true,
            };
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp(reply);
            } else {
              await interaction.reply(reply);
            }
          }
        }
      }
    }
  },
};
