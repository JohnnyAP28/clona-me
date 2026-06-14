const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ── Mapa de Nomes de Cores → HEX ─────────────────────
const COLOR_NAMES = {
  'vermelho': '#FF0000', 'red': '#FF0000',
  'verde': '#57F287', 'green': '#57F287',
  'azul': '#5865F2', 'blue': '#5865F2',
  'amarelo': '#FEE75C', 'yellow': '#FEE75C',
  'roxo': '#8A2BE2', 'purple': '#8A2BE2', 'violeta': '#8A2BE2',
  'rosa': '#EB459E', 'pink': '#EB459E',
  'laranja': '#F47B20', 'orange': '#F47B20',
  'ciano': '#00FFFF', 'cyan': '#00FFFF',
  'preto': '#000000', 'black': '#000000',
  'branco': '#FFFFFF', 'white': '#FFFFFF',
  'cinza': '#808080', 'gray': '#808080', 'grey': '#808080',
  'dourado': '#FFD700', 'gold': '#FFD700',
  'turquesa': '#1ABC9C', 'teal': '#1ABC9C',
};

function resolveColor(input) {
  if (!input) return '#8A2BE2';
  const raw = input.trim();
  // Se for HEX
  if (/^#?[0-9A-Fa-f]{6}$/.test(raw.replace('#', ''))) {
    return raw.startsWith('#') ? raw : `#${raw}`;
  }
  // Se for nome de cor
  const key = raw.toLowerCase();
  if (COLOR_NAMES[key]) return COLOR_NAMES[key];
  // Padrão
  return '#8A2BE2';
}

// ── Armazenamento em memória ──────────────────────────
const panels = new Map();
let nextId = 1;

function createPanel(guildId, ownerId, channelId) {
  const id = nextId++;
  const panel = {
    id, guildId, ownerId, channelId,
    title: '', description: '', price: '', externalPrice: '',
    deliveryType: 'manual',       // 'manual' | 'auto'
    iconUrl: '', bannerUrl: '',
    showStock: true, showSold: false,
    lockStock: false,
    color: '#8A2BE2',
    showThumbnail: true,          // true = mostrar ícone no canto superior direito
    stock: [],                    // [{ content, used: false }]
    soldCount: 0,
    messageId: null,
    published: false,
    createdAt: new Date(),
  };
  panels.set(id, panel);
  return panel;
}

function getPanel(id) { return panels.get(id) || null; }
function listPanels(guildId) { return [...panels.values()].filter(p => p.guildId === guildId); }
function deletePanel(id) { return panels.delete(id); }

// ── Construir Embed ───────────────────────────────────

function buildPanelEmbed(panel) {
  const colorDec = parseInt(resolveColor(panel.color).replace('#', ''), 16);

  const embed = new EmbedBuilder()
    .setTitle(panel.title || 'Painel de Venda')
    .setColor(colorDec);

  if (panel.description) {
    embed.setDescription(panel.description);
  }

  // Preço
  let priceText = panel.price || 'Sob consulta';
  if (panel.externalPrice) {
    priceText += ` ~~(R$ ${panel.externalPrice})~~`;
  }
  embed.addFields({ name: '💰 Valor', value: priceText, inline: true });

  // Entrega
  const deliveryLabel = panel.deliveryType === 'auto' ? '⚡ Automática' : '👤 Manual';
  embed.addFields({ name: '📦 Entrega', value: deliveryLabel, inline: true });

  // Estoque
  if (panel.showStock) {
    const available = panel.lockStock
      ? panel.stock.length
      : panel.stock.filter(s => !s.used).length;
    const total = panel.stock.length;
    const stockLabel = panel.lockStock
      ? `🔒 Ilimitado (${total} itens cadastrados)`
      : `${available}/${total} disponíveis`;
    embed.addFields({ name: '📊 Estoque', value: stockLabel, inline: true });
  }

  // Vendidos
  if (panel.showSold) {
    embed.addFields({ name: '🛒 Vendidos', value: `${panel.soldCount}`, inline: true });
  }

  // Thumbnail (sempre no canto superior direito — limite do Discord)
  if (panel.showThumbnail && panel.iconUrl) {
    embed.setThumbnail(panel.iconUrl);
  }

  // Banner (sempre no final do embed — limite do Discord)
  if (panel.bannerUrl) {
    embed.setImage(panel.bannerUrl);
  }

  embed.setFooter({ text: 'Clona-Me • Clique no botão abaixo para comprar' });
  embed.setTimestamp();
  return embed;
}

// ── Botão de Compra ───────────────────────────────────

function buildPurchaseButton(panelId, panel) {
  const hasStock = panel.lockStock || panel.stock.some(s => !s.used);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_${panelId}`)
      .setLabel('🛍️ Comprar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasStock && panel.stock.length > 0)
  );
}

// ── Gerenciar Estoque ─────────────────────────────────

function addStock(panelId, items) {
  const panel = getPanel(panelId);
  if (!panel) return false;
  for (const item of items) {
    panel.stock.push({ content: item, used: false });
  }
  return true;
}

function consumeStock(panelId) {
  const panel = getPanel(panelId);
  if (!panel) return null;
  // lockStock: sempre retorna o primeiro item (nunca marca como usado)
  if (panel.lockStock) {
    const item = panel.stock[0];
    if (!item) return null;
    panel.soldCount++;
    return item.content;
  }
  // Normal: consome o primeiro disponível
  const item = panel.stock.find(s => !s.used);
  if (!item) return null;
  item.used = true;
  panel.soldCount++;
  return item.content;
}

module.exports = {
  COLOR_NAMES,
  resolveColor,
  createPanel,
  getPanel,
  listPanels,
  deletePanel,
  buildPanelEmbed,
  buildPurchaseButton,
  addStock,
  consumeStock,
};
