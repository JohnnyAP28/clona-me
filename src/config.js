const { GatewayIntentBits } = require('discord.js');

module.exports = {
  // ═══════════════════════════════════════
  // CONFIGURAÇÃO DO BOT
  // ═══════════════════════════════════════

  // Token do bot (configure via variável de ambiente)
  token: process.env.DISCORD_TOKEN,

  // ID do cliente (Application ID do Discord Developer Portal)
  clientId: process.env.CLIENT_ID,

  // Intents necessários para clonagem completa
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],

  // Emoji de progresso (aparece nas mensagens de status)
  progressEmoji: '🔄',

  // Delay entre operações em massa (ms) para evitar rate limits
  rateLimitDelay: 500,

  // Batch size para clonagem de mensagens
  messageBatchSize: 100,
};
