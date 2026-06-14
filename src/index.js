const { Client, Collection } = require('discord.js');
const config = require('./config');
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({
  intents: config.intents,
  partials: [],
});

// ── Comandos ─────────────────────────────────────────
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`[OK] Comando carregado: /${command.data.name}`);
  } else {
    console.warn(`[AVISO] ${file} está faltando "data" ou "execute"`);
  }
}

// ── Eventos ──────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[OK] Evento carregado: ${event.name}`);
}

// ── Inicialização ────────────────────────────────────
client.login(config.token).catch(err => {
  console.error('[ERRO] Falha ao fazer login. Verifique seu DISCORD_TOKEN.');
  console.error(err.message);
  process.exit(1);
});

// Exporta o client para uso nos comandos
module.exports = { client };
