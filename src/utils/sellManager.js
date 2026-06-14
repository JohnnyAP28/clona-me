const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// ── Mapa de Nomes de Cores → HEX ─────────────────────
const COLOR_NAMES = {
  'vermelho': '#FF0000', 'red': '#FF0000', 'verde': '#57F287', 'green': '#57F287',
  'azul': '#5865F2', 'blue': '#5865F2', 'amarelo': '#FEE75C', 'yellow': '#FEE75C',
  'roxo': '#8A2BE2', 'purple': '#8A2BE2', 'violeta': '#8A2BE2',
  'rosa': '#EB459E', 'pink': '#EB459E', 'laranja': '#F47B20', 'orange': '#F47B20',
  'ciano': '#00FFFF', 'cyan': '#00FFFF', 'preto': '#000000', 'black': '#000000',
  'branco': '#FFFFFF', 'white': '#FFFFFF', 'cinza': '#808080', 'gray': '#808080', 'grey': '#808080',
  'dourado': '#FFD700', 'gold': '#FFD700', 'turquesa': '#1ABC9C', 'teal': '#1ABC9C',
};

function resolveColor(input) {
  if (!input) return '#8A2BE2';
  const raw = input.trim();
  if (/^#?[0-9A-Fa-f]{6}$/.test(raw.replace('#', ''))) return raw.startsWith('#') ? raw : `#${raw}`;
  const key = raw.toLowerCase();
  if (COLOR_NAMES[key]) return COLOR_NAMES[key];
  return '#8A2BE2';
}

// ── Persistência em arquivo JSON ──────────────────────
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'panels.json');

const panels = new Map();
let nextId = 1;

function saveToFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const data = { nextId, panels: [...panels.entries()].map(([id, p]) => [id, serializePanel(p)]) };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[SELL] Erro ao salvar:', e.message); }
}

function loadFromFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    nextId = data.nextId || 1;
    for (const [id, p] of data.panels) {
      panels.set(parseInt(id), deserializePanel(p));
    }
    console.log(`[SELL] ${panels.size} painéis carregados do disco.`);
  } catch (e) { console.error('[SELL] Erro ao carregar:', e.message); }
}

function serializePanel(p) {
  return {
    id: p.id, guildId: p.guildId, ownerId: p.ownerId, channelId: p.channelId,
    title: p.title, description: p.description, price: p.price, externalPrice: p.externalPrice,
    deliveryType: p.deliveryType, iconUrl: p.iconUrl, bannerUrl: p.bannerUrl,
    showStock: p.showStock, showSold: p.showSold, lockStock: p.lockStock,
    color: p.color, showThumbnail: p.showThumbnail,
    stock: p.stock, soldCount: p.soldCount,
    messageId: p.messageId, published: p.published,
    createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
  };
}

function deserializePanel(raw) {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt || Date.now()),
    stock: (raw.stock || []).map(s => typeof s === 'string' ? { content: s, used: false } : s),
  };
}

// Carrega do disco na inicialização
loadFromFile();

// ── API ───────────────────────────────────────────────

function createPanel(guildId, ownerId, channelId) {
  const id = nextId++;
  const panel = {
    id, guildId, ownerId, channelId,
    title: '', description: '', price: '', externalPrice: '',
    deliveryType: 'manual', iconUrl: '', bannerUrl: '',
    showStock: true, showSold: false, lockStock: false,
    color: '#8A2BE2', showThumbnail: true,
    stock: [], soldCount: 0,
    messageId: null, published: false, createdAt: new Date(),
  };
  panels.set(id, panel);
  saveToFile();
  return panel;
}

function getPanel(id) { return panels.get(id) || null; }
function listPanels(guildId) { return [...panels.values()].filter(p => p.guildId === guildId); }
function deletePanel(id) { const r = panels.delete(id); if (r) saveToFile(); return r; }

// ── Construir Embed ───────────────────────────────────

function buildPanelEmbed(panel) {
  const colorDec = parseInt(resolveColor(panel.color).replace('#', ''), 16);
  const embed = new EmbedBuilder().setTitle(panel.title || 'Painel de Venda').setColor(colorDec);
  if (panel.description) embed.setDescription(panel.description);
  let priceText = panel.price || 'Sob consulta';
  if (panel.externalPrice) priceText += ` ~~(R$ ${panel.externalPrice})~~`;
  embed.addFields({ name: '💰 Valor', value: priceText, inline: true });
  embed.addFields({ name: '📦 Entrega', value: panel.deliveryType === 'auto' ? '⚡ Automática' : '👤 Manual', inline: true });
  if (panel.showStock) {
    const available = panel.lockStock ? panel.stock.length : panel.stock.filter(s => !s.used).length;
    embed.addFields({ name: '📊 Estoque', value: panel.lockStock ? `🔒 Ilimitado (${panel.stock.length} itens)` : `${available}/${panel.stock.length} disponíveis`, inline: true });
  }
  if (panel.showSold) embed.addFields({ name: '🛒 Vendidos', value: `${panel.soldCount}`, inline: true });
  if (panel.showThumbnail && panel.iconUrl) embed.setThumbnail(panel.iconUrl);
  if (panel.bannerUrl) embed.setImage(panel.bannerUrl);
  embed.setFooter({ text: 'Clona-Me • Clique no botão abaixo para comprar' }).setTimestamp();
  return embed;
}

function buildPurchaseButton(panelId, panel) {
  const hasStock = panel.lockStock || panel.stock.some(s => !s.used);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`buy_${panelId}`).setLabel('🛍️ Comprar').setStyle(ButtonStyle.Success).setDisabled(!hasStock && panel.stock.length > 0)
  );
}

function addStock(panelId, items) {
  const panel = getPanel(panelId);
  if (!panel) return false;
  for (const item of items) panel.stock.push({ content: item, used: false });
  saveToFile();
  return true;
}

function consumeStock(panelId) {
  const panel = getPanel(panelId);
  if (!panel) return null;
  if (panel.lockStock) {
    const item = panel.stock[0];
    if (!item) return null;
    panel.soldCount++;
    saveToFile();
    return item.content;
  }
  const item = panel.stock.find(s => !s.used);
  if (!item) return null;
  item.used = true;
  panel.soldCount++;
  saveToFile();
  return item.content;
}

// Wrapper: save after any mutation
const origSet = panels.set.bind(panels);
panels.set = function(id, panel) { const r = origSet(id, panel); saveToFile(); return r; };

module.exports = {
  COLOR_NAMES, resolveColor,
  createPanel, getPanel, listPanels, deletePanel,
  buildPanelEmbed, buildPurchaseButton, addStock, consumeStock,
};
