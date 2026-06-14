const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ── Armazenamento em memória ──────────────────────────
const panels = new Map();
let nextId = 1;

/**
 * Cria um novo painel de venda (rascunho)
 */
function createPanel(guildId, ownerId, channelId) {
  const id = nextId++;
  const panel = {
    id,
    guildId,
    ownerId,
    channelId,
    title: '',
    description: '',
    price: '',
    externalPrice: '',
    deliveryType: 'manual',       // 'manual' | 'auto'
    iconUrl: '',
    bannerUrl: '',
    showStock: true,
    showSold: false,
    lockStock: false,             // true = estoque não diminui
    color: '#8A2BE2',
    thumbnailPosition: 'top',     // 'top' | 'middle' | 'bottom'
    stock: [],                    // [{ content, used: false }]
    soldCount: 0,
    messageId: null,
    published: false,
    createdAt: new Date(),
  };
  panels.set(id, panel);
  return panel;
}

function getPanel(id) {
  return panels.get(id) || null;
}

function listPanels(guildId) {
  return [...panels.values()].filter(p => p.guildId === guildId);
}

// ── Construir Embed ───────────────────────────────────

function buildPanelEmbed(panel) {
  const embed = new EmbedBuilder()
    .setTitle(panel.title || 'Painel de Venda')
    .setColor(parseInt(panel.color.replace('#', ''), 16));

  // Descrição
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
    const available = panel.stock.filter(s => !s.used).length;
    const total = panel.stock.length;
    const stockLabel = panel.lockStock
      ? `🔒 Ilimitado (${total} itens)` 
      : `${available}/${total} disponíveis`;
    embed.addFields({ name: '📊 Estoque', value: stockLabel, inline: true });
  }

  // Vendidos
  if (panel.showSold) {
    embed.addFields({ name: '🛒 Vendidos', value: `${panel.soldCount}`, inline: true });
  }

  // Thumbnail (posição baseada em thumbnailPosition)
  if (panel.iconUrl) {
    embed.setThumbnail(panel.iconUrl);
  }

  // Banner
  if (panel.bannerUrl) {
    embed.setImage(panel.bannerUrl);
  }

  embed.setFooter({ text: 'Clona-Me • Clique no botão abaixo para comprar' });
  embed.setTimestamp();

  return embed;
}

// ── Botão de Compra ───────────────────────────────────

function buildPurchaseButton(panelId, disabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_${panelId}`)
      .setLabel('🛍️ Comprar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

// ── Gerenciar Estoque ─────────────────────────────────

function addStock(panelId, items) {
  const panel = getPanel(panelId);
  if (!panel) return false;
  for (const item of items) {
    panel.stock.push({ content: item.trim(), used: false });
  }
  return true;
}

function consumeStock(panelId) {
  const panel = getPanel(panelId);
  if (!panel || panel.lockStock) return null;
  const item = panel.stock.find(s => !s.used);
  if (!item) return null;
  item.used = true;
  panel.soldCount++;
  return item.content;
}

// ── Entrega Automática ────────────────────────────────

async function deliverAuto(interaction, panel) {
  const item = consumeStock(panel.id);
  if (!item) {
    return interaction.followUp({
      content: '❌ Estoque esgotado. A staff será notificada.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎁 Entrega Automática')
    .setColor(0x57f287)
    .setDescription(`**${panel.title}**\n\nObrigado pela compra! Aqui está seu produto:`)
    .addFields({ name: '📦 Conteúdo', value: item.slice(0, 1024) })
    .setFooter({ text: 'Clona-Me • Entrega automática' })
    .setTimestamp();

  await interaction.followUp({
    embeds: [embed],
    ephemeral: true,
  });

  // Notificar staff
  if (interaction.channel) {
    await interaction.channel.send({
      content: `✅ **Venda #${panel.soldCount}** • ${panel.title} entregue para ${interaction.user}`,
    });
  }
}

module.exports = {
  createPanel,
  getPanel,
  listPanels,
  buildPanelEmbed,
  buildPurchaseButton,
  addStock,
  consumeStock,
  deliverAuto,
};
