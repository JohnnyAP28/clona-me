const { EmbedBuilder } = require('discord.js');
const { getPanel, buildPanelEmbed, buildPurchaseButton, addStock, consumeStock, resolveColor } = require('../utils/sellManager');
const sell = require('../commands/sell');
const editCmd = require('../commands/edit');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ═══════════════════════════════════════════
    //  SLASH COMMANDS
    // ═══════════════════════════════════════════
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) { console.error(`[ERRO] Comando não encontrado: ${interaction.commandName}`); return; }
      try { await cmd.execute(interaction); }
      catch (e) { console.error(`[ERRO] ${interaction.commandName}:`, e); await safeReply(interaction, 'Erro ao executar comando.'); }
      return;
    }

    // ═══════════════════════════════════════════
    //  MODALS
    // ═══════════════════════════════════════════
    if (interaction.isModalSubmit()) {
      const cid = interaction.customId;

      // Clona-Me
      if (cid === 'clone_modal') return handleCmdModal(interaction, 'clone');
      if (cid === 'clean_modal') return handleCmdModal(interaction, 'resetar');

      // /venda sub-modals
      if (cid.startsWith('sell_modal_')) return handleSellMainModal(interaction);
      if (cid.startsWith('sell_stock_')) return handleStockModal(interaction, cid);
      if (cid.startsWith('sell_delivery_')) return handleDeliveryModal(interaction, cid);
      if (cid.startsWith('sell_icon_')) return handleIconModal(interaction, cid);
      if (cid.startsWith('sell_banner_')) return handleBannerModal(interaction, cid);
      if (cid.startsWith('sell_display_')) return handleDisplayModal(interaction, cid);

      // /editar modals
      if (cid.startsWith('edit_items_')) return handleEditItemsModal(interaction, cid);
    }

    // ═══════════════════════════════════════════
    //  BUTTONS
    // ═══════════════════════════════════════════
    if (interaction.isButton()) {
      const cid = interaction.customId;
      if (cid.startsWith('sellcfg_')) return handleConfigButton(interaction, cid);
      if (cid.startsWith('buy_')) return handlePurchaseButton(interaction, cid);
      if (cid.startsWith('editcfg_')) return handleEditConfigButton(interaction, cid);
    }

    // ═══════════════════════════════════════════
    //  SELECT MENUS
    // ═══════════════════════════════════════════
    if (interaction.isStringSelectMenu()) {
      const cid = interaction.customId;
      if (cid.startsWith('sell_thumb_')) return handleThumbSelect(interaction, cid);
      if (cid.startsWith('edit_select_')) return handleEditSelect(interaction, cid);
    }
  },
};

// ── Utils ──────────────────────────────────────────
async function safeReply(i, msg) {
  try {
    if (i.replied || i.deferred) await i.followUp({ content: msg, ephemeral: true });
    else await i.reply({ content: msg, ephemeral: true });
  } catch (_) {}
}
function pid(cid) { return parseInt(cid.split('_').pop()); }

async function handleCmdModal(i, name) {
  const cmd = i.client.commands.get(name);
  if (!cmd?.handleModal) return safeReply(i, 'Erro interno.');
  try { await cmd.handleModal(i); } catch (e) { console.error(`[ERRO] ${name}:`, e); await safeReply(i, 'Erro ao processar.'); }
}

// ═══════════════════════════════════════════════
//  /VENDA — MODALS
// ═══════════════════════════════════════════════

async function handleSellMainModal(i) {
  const cmd = i.client.commands.get('venda');
  if (!cmd?.handleModal) return safeReply(i, 'Erro interno.');
  try { await cmd.handleModal(i); } catch (e) { console.error('[ERRO] sell modal:', e); await safeReply(i, 'Erro ao processar painel.'); }
}

async function handleStockModal(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  const raw = i.fields.getTextInputValue('stock_items').trim();
  const lock = i.fields.getTextInputValue('stock_lock').trim().toLowerCase();
  panel.lockStock = lock === 'sim' || lock === 's';
  // Parse: suporta "item1\n--\nitem2" e "item1 -- item2"
  const items = raw.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean)
    .filter(s => s !== '--') // remove linhas só com "--"
    .join(' -- ')           // rejunta com "--" para split final
    .split('--').map(s => s.trim()).filter(Boolean);
  if (items.length > 0) {
    addStock(panel.id, items);
    await i.reply({ content: `✅ ${items.length} itens no estoque.${panel.lockStock ? ' 🔒 Estoque travado (não diminui).' : ''}`, ephemeral: true });
  } else {
    await i.reply({ content: 'Nenhum item adicionado.', ephemeral: true });
  }
}

async function handleDeliveryModal(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  panel.deliveryType = i.fields.getTextInputValue('delivery_type').trim().toLowerCase() === 'auto' ? 'auto' : 'manual';
  await i.reply({ content: `✅ Entrega: ${panel.deliveryType === 'auto' ? '⚡ Automática' : '👤 Manual'}`, ephemeral: true });
}

async function handleIconModal(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  panel.iconUrl = i.fields.getTextInputValue('icon_url').trim();
  await i.reply({ content: panel.iconUrl ? '✅ Ícone atualizado.' : '✅ Ícone removido.', ephemeral: true });
}

async function handleBannerModal(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  panel.bannerUrl = i.fields.getTextInputValue('banner_url').trim();
  await i.reply({ content: panel.bannerUrl ? '✅ Banner atualizado.' : '✅ Banner removido.', ephemeral: true });
}

async function handleDisplayModal(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  panel.showStock = i.fields.getTextInputValue('show_stock').trim().toLowerCase().startsWith('s');
  panel.showSold = i.fields.getTextInputValue('show_sold').trim().toLowerCase().startsWith('s');
  await i.reply({ content: `✅ Estoque: ${panel.showStock ? 'visível' : 'oculto'} • Vendidos: ${panel.showSold ? 'visível' : 'oculto'}`, ephemeral: true });
}

// ═══════════════════════════════════════════════
//  /VENDA — CONFIG BUTTONS
// ═══════════════════════════════════════════════

async function handleConfigButton(i, cid) {
  const panelId = pid(cid);
  const panel = getPanel(panelId);
  if (!panel) return safeReply(i, 'Painel expirado. Use /venda novamente.');

  const action = cid.replace(/sellcfg_/, '').replace(/_\d+$/, '');

  if (action === 'stock') return i.showModal(sell.buildStockModal(panelId));
  if (action === 'deliv') return i.showModal(sell.buildDeliveryModal(panelId, panel.deliveryType));
  if (action === 'icon') return i.showModal(sell.buildIconModal(panelId, panel.iconUrl));
  if (action === 'banner') return i.showModal(sell.buildBannerModal(panelId, panel.bannerUrl));
  if (action === 'display') return i.showModal(sell.buildDisplayModal(panelId, panel));
  if (action === 'thumb') {
    panel.showThumbnail = !panel.showThumbnail;
    return i.reply({ content: `✅ Thumbnail: ${panel.showThumbnail ? 'ON' : 'OFF'}`, ephemeral: true });
  }
  if (action === 'preview') {
    const embed = buildPanelEmbed(panel);
    embed.setTitle(`🔍 Preview — ${panel.title || 'Painel de Venda'}`);
    return i.reply({ embeds: [embed], ephemeral: true });
  }
  if (action === 'pub') {
    if (!panel.title || !panel.price) return safeReply(i, 'Preencha título e valor antes de publicar.');
    await i.deferReply({ ephemeral: true });
    try {
      const ch = i.client.channels.cache.get(panel.channelId);
      if (!ch) return i.followUp({ content: 'Canal não encontrado.', ephemeral: true });
      const embed = buildPanelEmbed(panel);
      const btn = buildPurchaseButton(panel.id, panel);
      const msg = await ch.send({ embeds: [embed], components: [btn] });
      panel.messageId = msg.id;
      panel.published = true;
      await i.followUp({ content: `✅ Painel #${panel.id} publicado em ${ch}.`, ephemeral: true });
    } catch (e) {
      console.error('[ERRO] Publish:', e);
      await i.followUp({ content: `Erro: ${e.message}`, ephemeral: true });
    }
    return;
  }
}

// ═══════════════════════════════════════════════
//  SELECIONAR POSIÇÃO (agora toggle ON/OFF)
// ═══════════════════════════════════════════════

async function handleThumbSelect(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  const val = i.values[0];
  panel.showThumbnail = val !== 'none';
  await i.reply({ content: `✅ Thumbnail: ${panel.showThumbnail ? 'ON' : 'OFF'}`, ephemeral: true });
}

// ═══════════════════════════════════════════════
//  PURCHASE BUTTON
// ═══════════════════════════════════════════════

async function handlePurchaseButton(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Este painel não está mais disponível.');
  await i.deferReply({ ephemeral: true });

  const item = consumeStock(panel.id);
  if (!item) {
    return i.followUp({ content: '❌ Estoque esgotado. Avise a staff.', ephemeral: true });
  }

  // Atualiza painel publicado
  if (panel.published && panel.messageId) {
    try {
      const ch = i.client.channels.cache.get(panel.channelId);
      const msg = await ch?.messages.fetch(panel.messageId).catch(() => null);
      if (msg) {
        const emb = buildPanelEmbed(panel);
        const btn = buildPurchaseButton(panel.id, panel);
        await msg.edit({ embeds: [emb], components: [btn] });
      }
    } catch (_) {}
  }

  const emb = new EmbedBuilder()
    .setTitle(panel.deliveryType === 'auto' ? '🎁 Compra Realizada — Entrega Automática' : '🛒 Compra Realizada')
    .setColor(0x57f287)
    .setDescription(`**${panel.title}**\n${panel.deliveryType === 'auto' ? 'Obrigado por comprar! Aqui está seu produto:' : 'A staff fará a entrega em breve.'}`)
    .addFields({ name: panel.deliveryType === 'auto' ? '📦 Conteúdo' : '⏳ Aguardando', value: item.slice(0, 1024) })
    .setFooter({ text: `Venda #${panel.soldCount} • Clona-Me` }).setTimestamp();

  await i.followUp({ embeds: [emb], ephemeral: true });
}

// ═══════════════════════════════════════════════
//  /EDITAR — HANDLERS
// ═══════════════════════════════════════════════

async function handleEditConfigButton(i, cid) {
  const panelId = pid(cid);
  const panel = getPanel(panelId);
  if (!panel) return safeReply(i, 'Painel expirado.');

  if (cid.startsWith('editcfg_stock_')) return i.showModal(sell.buildStockModal(panelId));
  if (cid.startsWith('editcfg_deliv_')) return i.showModal(sell.buildDeliveryModal(panelId, panel.deliveryType));
  if (cid.startsWith('editcfg_icon_')) return i.showModal(sell.buildIconModal(panelId, panel.iconUrl));
  if (cid.startsWith('editcfg_banner_')) return i.showModal(sell.buildBannerModal(panelId, panel.bannerUrl));
  if (cid.startsWith('editcfg_display_')) return i.showModal(sell.buildDisplayModal(panelId, panel));
  if (cid.startsWith('editcfg_thumb_')) {
    panel.showThumbnail = !panel.showThumbnail;
    return i.reply({ content: `✅ Thumbnail: ${panel.showThumbnail ? 'ON' : 'OFF'}`, ephemeral: true });
  }
  if (cid.startsWith('editcfg_title_')) {
    return i.showModal(
      new (require('discord.js').ModalBuilder)().setCustomId(`edit_title_${panelId}`).setTitle('Editar Título')
        .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
          new (require('discord.js').TextInputBuilder)().setCustomId('new_title').setLabel('Novo título').setStyle(1).setRequired(true).setMaxLength(256).setValue(panel.title)
        ))
    );
  }
  if (cid.startsWith('editcfg_desc_')) {
    return i.showModal(
      new (require('discord.js').ModalBuilder)().setCustomId(`edit_desc_${panelId}`).setTitle('Editar Descrição')
        .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
          new (require('discord.js').TextInputBuilder)().setCustomId('new_desc').setLabel('Nova descrição').setStyle(2).setRequired(true).setMaxLength(2000).setValue(panel.description)
        ))
    );
  }
  if (cid.startsWith('editcfg_price_')) {
    return i.showModal(
      new (require('discord.js').ModalBuilder)().setCustomId(`edit_price_${panelId}`).setTitle('Editar Valor')
        .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
          new (require('discord.js').TextInputBuilder)().setCustomId('new_price').setLabel('Novo valor').setStyle(1).setRequired(true).setMaxLength(60).setValue(panel.price)
        ))
    );
  }
  if (cid.startsWith('editcfg_color_')) {
    return i.showModal(
      new (require('discord.js').ModalBuilder)().setCustomId(`edit_color_${panelId}`).setTitle('Editar Cor')
        .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
          new (require('discord.js').TextInputBuilder)().setCustomId('new_color').setLabel('Cor (HEX ou nome)').setStyle(1).setRequired(false).setMaxLength(32).setValue(panel.color)
        ))
    );
  }
  if (cid.startsWith('editcfg_delete_')) {
    panel.published = false;
    return i.reply({ content: `Painel #${panel.id} "${panel.title}" — confirme com ✅ para deletar.`, ephemeral: true });
  }
  if (cid.startsWith('editcfg_items_')) {
    return i.showModal(
      new (require('discord.js').ModalBuilder)().setCustomId(`edit_items_${panelId}`).setTitle('Limpar/Substituir Estoque')
        .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
          new (require('discord.js').TextInputBuilder)().setCustomId('replace_items').setLabel('Novos itens (um por linha, separados por --)').setPlaceholder('item1\n--\nitem2').setStyle(2).setRequired(false).setMaxLength(2000)
        ))
    );
  }
}

async function handleEditItemsModal(i, cid) {
  const panel = getPanel(pid(cid));
  if (!panel) return safeReply(i, 'Painel expirado.');
  const raw = i.fields.getTextInputValue('replace_items').trim();
  if (raw) {
    panel.stock = [];
    const items = raw.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean)
      .filter(s => s !== '--').join(' -- ').split('--').map(s => s.trim()).filter(Boolean);
    addStock(panel.id, items);
    await i.reply({ content: `✅ Estoque substituído: ${items.length} itens.`, ephemeral: true });
  } else {
    await i.reply({ content: 'Nenhum item. Estoque mantido.', ephemeral: true });
  }
}

async function handleEditSelect(i, cid) {
  const panelId = pid(cid);
  const panel = getPanel(panelId);
  if (!panel) return safeReply(i, 'Painel expirado.');

  const action = i.values[0];

  if (action === 'delete') {
    const { deletePanel } = require('../utils/sellManager');
    deletePanel(panelId);
    return i.reply({ content: `🗑️ Painel #${panelId} "${panel.title}" deletado.`, ephemeral: true });
  }

  if (action === 'edit_items') {
    return i.showModal(
      new (require('discord.js').ModalBuilder)().setCustomId(`edit_items_${panelId}`).setTitle('Substituir Estoque')
        .addComponents(new (require('discord.js').ActionRowBuilder)().addComponents(
          new (require('discord.js').TextInputBuilder)().setCustomId('replace_items').setLabel('Novos itens (um por linha, --)').setPlaceholder('item1\n--\nitem2').setStyle(2).setRequired(false).setMaxLength(2000)
        ))
    );
  }
}
