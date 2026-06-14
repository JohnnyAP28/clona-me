/**
 * Script para registrar os slash commands no Discord.
 * Execute: node src/deploy-commands.js
 */
const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('[DEPLOY] Registrando comandos...');

    // Registro global (pode levar até 1 hora para propagar)
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });

    console.log(`[DEPLOY] ${commands.length} comando(s) registrado(s) com sucesso!`);
  } catch (error) {
    console.error('[ERRO] Falha ao registrar comandos:', error);
  }
})();
