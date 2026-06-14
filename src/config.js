const { GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// ── Config persistente ──────────────────────────
const CONFIG_FILE = path.join(__dirname, '..', '..', 'data', 'config.json');

function loadPersistedConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {};
}

function savePersistedConfig(obj) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(obj, null, 2));
  } catch (_) {}
}

const persisted = loadPersistedConfig();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
  progressEmoji: '🔄',
  rateLimitDelay: 500,
  messageBatchSize: 100,
  defaultServerName: 'Primo(TESTE)☢️',
  defaultIconUrl: 'https://storage.googleapis.com/figapp-44eac.appspot.com/chat-attachments/TmTWY9pePXfxbDTZiLCMw9zdb5l1/cf075880-2ccd-5893-bc62-aa539cb2e619/images/1781405532911-xmfxww3tlsk.jpg',
  factoryCategory: '💻・Comandos',
  factoryChannel: '┃⌨️・comandos',
  serverInvite: 'https://discord.gg/hykfavEur',

  // PIX — persistente
  get pixKey() { return persisted.pixKey || ''; },
  set pixKey(v) { persisted.pixKey = v; savePersistedConfig(persisted); },
  get pixQrUrl() { return persisted.pixQrUrl || ''; },
  set pixQrUrl(v) { persisted.pixQrUrl = v; savePersistedConfig(persisted); },
};
