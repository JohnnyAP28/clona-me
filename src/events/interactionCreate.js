const { EmbedBuilder } = require('discord.js');
const { getPanel, buildPanelEmbed, buildPurchaseButton, addStock, consumeStock, deliverAuto } = require('../utils/sellManager');
const sell = require('../commands/sell');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ═══════════════════════════════════════════════════════
    //  SLASH COMMANDS
    // ═══════════════════════════════════════════════════════
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[ERRO] Comando não encontrado: ${interaction.commandName}`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[ERRO] ${interaction.commandName}:`, error);
        const reply = { content: 'Ocorreu um erro ao executar este comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
        else await interaction.reply(reply);
      }
    }

    // ═══════════════════════════════════════════════════════
    //  MODAL SUBMITS
    // ═══════════════════════════════════════════════════════
    if (interaction.isModalSubmit()) {
      const cid = interaction.customId;

      // ── Clona-Me modals ──
      if (cid === 'clone_modal' || cid === 'clean_modal') {
        const modalMap = { 'clone_modal': 'clone', 'clean_modal': 'resetar' };
        await handleCommandModal(interaction, modalMap[cid]);
        return;
      }

      // ── /venda modal principal ──
      if (cid.startsWith('sell_modal_')) {
        const cmd = interaction.client.commands.get('venda');
        if (cmd?.handleModal) {
          try { await cmd.handleModal(interaction); }
          catch (e) { console.error('[ERRO] sell modal:', e); await safeReply(interaction, 'Erro ao processar o painel.'); }
        }
        return;
      }

      // ── /venda sub-modals ──
      await handleSellModal(interaction, cid);
    }

    // ═══════════════════════════════════════════════════════
    //  BUTTONS
    // ═══════════════════════════════════════════════════════
    if (interaction.isButton()) {
      const cid = interaction.customId;
      await handleSellButton(interaction, cid);
    }

    // ═══════════════════════════════════════════════════════
    //  SELECT MENUS
    // ═══════════════════════════════════════════════════════
    if (interaction.isStringSelectMenu()) {
      const cid = interaction.customId;
      await handleSellSelect(interaction, cid);
    }
  },
};

// ── Helpers ─────────────────────────────────────────

async function handleCommandModal(interaction, commandName) {
  const command = interaction.client.commands.get(commandName);
  if (!command?.handleModal) {
    console.error(`[ERRO] "${commandName}" não tem handleModal`);
    return safeReply(interaction, 'Erro interno. O comando não possui manipulador de formulário.');
  }
  try { await command.handleModal(interaction); }
  catch (e) { console.error('[ERRO] Modal:', e); await safeReply(interaction, 'Erro ao processar o formulário.'); }
}

async function safeReply(interaction, msg) {
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content: msg, ephemeral: true });
    else await interaction.reply({ content: msg, ephemeral: true });
  } catch (_) {}
}

function parsePanelId(cid) {
  const parts = cid.split('_');
  return parseInt(parts[parts.length - 1]);
}

// ── Sell Modal Handlers ─────────────────────────────

async function handleSellModal(interaction, cid) {
  const panelId = parsePanelId(cid);
  const panel = getPanel(panelId);
  if (!panel) return safeReply(interaction, 'Painel expirado. Use /venda novamente.');

  try {
    if (cid.startsWith('sell_stock_')) {
      const items = interaction.fields.getTextInputValue('stock_items').trim();
      const lock = interaction.fields.getTextInputValue('stock_lock').trim().toLowerCase();
      panel.lockStock = lock === 'sim' || lock === 's';
      if (items) {
        const stockItems = items.split('--').map(s => s.trim()).filter(Boolean);
        addStock(panelId, stockItems);
        await interaction.reply({ content: `✅ ${stockItems.length} itens adicionados ao estoque.${panel.lockStock ? ' 🔒 Estoque travado.' : ''}`, ephemeral: true });
        return;
      }
      await interaction.reply({ content: 'Nenhum item adicionado.', ephemeral: true });
      return;
    }

    if (cid.startsWith('sell_delivery_')) {
      const type = interaction.fields.getTextInputValue('delivery_type').trim().toLowerCase();
      panel.deliveryType = type === 'auto' ? 'auto' : 'manual';
      await interaction.reply({ content: `✅ Entrega: ${panel.deliveryType === 'auto' ? '⚡ Automática' : '👤 Manual'}`, ephemeral: true });
      return;
    }

    if (cid.startsWith('sell_icon_')) {
      const url = interaction.fields.getTextInputValue('icon_url').trim();
      panel.iconUrl = url;
      await interaction.reply({ content: url ? '✅ Ícone atualizado.' : '✅ Ícone removido.', ephemeral: true });
      return;
    }

    if (cid.startsWith('sell_banner_')) {
      const url = interaction.fields.getTextInputValue('banner_url').trim();
      panel.bannerUrl = url;
      await interaction.reply({ content: url ? '✅ Banner atualizado.' : '✅ Banner removido.', ephemeral: true });
      return;
    }

    if (cid.startsWith('sell_display_')) {
      const showStock = interaction.fields.getTextInputValue('show_stock').trim().toLowerCase();
      const showSold = interaction.fields.getTextInputValue('show_sold').trim().toLowerCase();
      panel.showStock = showStock === 'sim' || showStock === 's';
      panel.showSold = showSold === 'sim' || showSold === 's';
      await interaction.reply({ content: `✅ Estoque: ${panel.showStock ? 'visível' : 'oculto'} • Vendidos: ${panel.showSold ? 'visível' : 'oculto'}`, ephemeral: true });
      return;
    }
  } catch (e) {
    console.error('[ERRO] Sell modal:', e);
    await safeReply(interaction, 'Erro ao processar configuração.');
  }
}

// ── Sell Button Handlers ────────────────────────────

async function handleSellButton(interaction, cid) {
  const panelId = parsePanelId(cid);

  // ── Config buttons ──
  if (cid.startsWith('sell_config_stock_')) {
    return interaction.showModal(sell.buildStockModal(panelId));
  }
  if (cid.startsWith('sell_config_delivery_')) {
    const panel = getPanel(panelId);
    return interaction.showModal(sell.buildDeliveryModal(panelId, panel?.deliveryType));
  }
  if (cid.startsWith('sell_config_icon_')) {
    const panel = getPanel(panelId);
    return interaction.showModal(sell.buildIconModal(panelId, panel?.iconUrl));
  }
  if (cid.startsWith('sell_config_banner_')) {
    const panel = getPanel(panelId);
    return interaction.showModal(sell.buildBannerModal(panelId, panel?.bannerUrl));
  }
  if (cid.startsWith('sell_config_display_')) {
    const panel = getPanel(panelId);
    return interaction.showModal(sell.buildDisplayModal(panelId, panel));
  }
  if (cid.startsWith('sell_config_thumb_')) {
    const panel = getPanel(panelId);
    return interaction.reply({
      content: 'Escolha a posição do thumbnail:',
      components: [sell.buildThumbSelect(panelId, panel?.thumbnailPosition || 'top')],
      ephemeral: true,
    });
  }

  // ── Preview ──
  if (cid.startsWith('sell_config_preview_')) {
    const panel = getPanel(panelId);
    if (!panel) return safeReply(interaction, 'Painel expirado.');
    const embed = buildPanelEmbed(panel);
    embed.setTitle(`🔍 Preview — ${panel.title || 'Painel de Venda'}`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ── Publish ──
  if (cid.startsWith('sell_config_publish_')) {
    const panel = getPanel(panelId);
    if (!panel) return safeReply(interaction, 'Painel expirado.');
    if (!panel.title || !panel.price) return safeReply(interaction, 'Preencha título e valor antes de publicar.');

    await interaction.deferReply({ ephemeral: true });
    try {
      const channel = interaction.client.channels.cache.get(panel.channelId);
      if (!channel) {
        return interaction.followUp({ content: 'Canal não encontrado.', ephemeral: true });
      }

      const embed = buildPanelEmbed(panel);
      const hasStock = panel.stock.filter(s => !s.used).length > 0;
      const button = buildPurchaseButton(panel.id, !hasStock && !panel.lockStock);

      const msg = await channel.send({ embeds: [embed], components: [button] });
      panel.messageId = msg.id;
      panel.published = true;

      await interaction.followUp({ content: `✅ Painel #${panel.id} publicado em ${channel}.`, ephemeral: true });
    } catch (e) {
      console.error('[ERRO] Publish:', e);
      await interaction.followUp({ content: `Erro ao publicar: ${e.message}`, ephemeral: true });
    }
    return;
  }

  // ── Purchase button ──
  if (cid.startsWith('buy_')) {
    const panel = getPanel(panelId);
    if (!panel) return safeReply(interaction, 'Este painel não está mais disponível.');

    await interaction.deferReply({ ephemeral: true });

    if (panel.deliveryType === 'auto') {
      // Entrega automática — consome estoque e entrega
      const item = consumeStock(panel.id);
      if (!item) {
        return interaction.followUp({ content: '❌ Estoque esgotado. Avise a staff.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎁 Compra Realizada — Entrega Automática')
        .setColor(0x57f287)
        .setDescription(`**${panel.title}**\n\nObrigado por comprar! Aqui está seu produto:`)
        .addFields({ name: '📦 Conteúdo', value: item.slice(0, 1024) })
        .setFooter({ text: `Venda #${panel.soldCount} • Clona-Me` })
        .setTimestamp();

      // Atualiza o painel publicado se existir
      if (panel.published && panel.messageId) {
        try {
          const ch = interaction.client.channels.cache.get(panel.channelId);
          const msg = await ch?.messages.fetch(panel.messageId).catch(() => null);
          if (msg) {
            const newEmbed = buildPanelEmbed(panel);
            const hasStock = panel.stock.filter(s => !s.used).length > 0;
            const btn = buildPurchaseButton(panel.id, !hasStock && !panel.lockStock);
            await msg.edit({ embeds: [newEmbed], components: [btn] });
          }
        } catch (_) {}
      }

      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    // Entrega manual — notifica staff
    const embed = new EmbedBuilder()
      .setTitle('🛒 Nova Compra')
      .setColor(0xf0b232)
      .setDescription(
        `**${panel.title}**\n` +
        `**Valor:** ${panel.price}\n` +
        `**Comprador:** ${interaction.user} (${interaction.user.id})\n` +
        `**Entrega:** 👤 Manual — a staff deve fazer a entrega.`
      )
      .setFooter({ text: `Painel #${panel.id} • Aguardando entrega` })
      .setTimestamp();

    panel.soldCount++;

    return interaction.followUp({
      content: '✅ Compra registrada! A staff fará a entrega em breve.',
      embeds: [embed],
      ephemeral: true,
    });
  }
}

// ── Sell Select Handlers ────────────────────────────

async function handleSellSelect(interaction, cid) {
  if (cid.startsWith('sell_thumb_')) {
    const panelId = parsePanelId(cid);
    const panel = getPanel(panelId);
    if (!panel) return safeReply(interaction, 'Painel expirado.');

    const value = interaction.values[0];
    panel.thumbnailPosition = value;

    const labels = { top: 'Topo', middle: 'Meio', bottom: 'Fim', none: 'Sem thumbnail' };
    await interaction.reply({ content: `✅ Posição do thumbnail: **${labels[value]}**`, ephemeral: true });
  }
}
