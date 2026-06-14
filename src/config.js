const { GatewayIntentBits } = require('discord.js');

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
  // ── Modo Fábrica ─────────────────────────────
  defaultServerName: 'Primo(TESTE)☢️',
  defaultIconUrl: 'https://storage.googleapis.com/figapp-44eac.appspot.com/chat-attachments/TmTWY9pePXfxbDTZiLCMw9zdb5l1/cf075880-2ccd-5893-bc62-aa539cb2e619/images/1781405532911-xmfxww3tlsk.jpg',
  // ── Canais pós-reset ─────────────────────────
  factoryCategory: '💻・Comandos',
  factoryChannel: '┃⌨️・comandos',
};
