const { GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const CFG = path.join(process.cwd(), 'data', 'config.json');
function lc() { try { if (fs.existsSync(CFG)) return JSON.parse(fs.readFileSync(CFG, 'utf-8')); } catch (_) { } return {}; }
function sc(d) { try { const dir = path.dirname(CFG); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(CFG, JSON.stringify(d, null, 2)); } catch (_) { } }
const p = lc();
module.exports = {
  token: process.env.DISCORD_TOKEN, clientId: process.env.CLIENT_ID,
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.GuildEmojisAndStickers],
  progressEmoji: '🔄', rateLimitDelay: 500, messageBatchSize: 100,
  defaultServerName: 'Primo(TESTE)☢️', factoryCategory: '💻・Comandos', factoryChannel: '⌨️・comandos',
  defaultIconUrl: 'https://storage.googleapis.com/figapp-44eac.appspot.com/chat-attachments/TmTWY9pePXfxbDTZiLCMw9zdb5l1/cf075880-2ccd-5893-bc62-aa539cb2e619/images/1781405532911-xmfxww3tlsk.jpg',
  serverInvite: 'https://discord.gg/hykfavEur',
  get pixKey() { return p.pixKey || ''; }, set pixKey(v) { p.pixKey = v; sc(p); },
  get pixQrUrl() { return p.pixQrUrl || ''; }, set pixQrUrl(v) { p.pixQrUrl = v; sc(p); },
  get logChannelId() { return p.logChannelId || ''; }, set logChannelId(v) { p.logChannelId = v; sc(p); },
  get customerRoleId() { return p.customerRoleId || ''; }, set customerRoleId(v) { p.customerRoleId = v; sc(p); },
  get webhookUrl() { return p.webhookUrl || ''; }, set webhookUrl(v) { p.webhookUrl = v; sc(p); },
};
