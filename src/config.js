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
  defaultServerName: 'Primo(TESTE)🏳️‍🌈',
  defaultIconUrl: 'https://storage.googleapis.com/figapp-44eac.appspot.com/chat-attachments/TmTWY9pePXfxbDTZiLCMw9zdb5l1/f3c4a21e-ed94-46bf-8a49-430abd71b1a8/images/1781405242113-hdfnhwjlk7o.png',
};
