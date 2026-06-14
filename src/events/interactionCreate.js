const { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { getPanel, buildPanelEmbed, buildPurchaseButton, addStock, consumeStock, resolveColor, listPanels, deletePanel } = require('../utils/sellManager');
const sell = require('../commands/sell');
const { showEditMenu } = require('../commands/edit');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ═══ SLASH COMMANDS ═══
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) { console.error(`[ERRO] Cmd: ${interaction.commandName}`); return; }
      try { await cmd.execute(interaction); }
      catch (e) {
        console.error(`[ERRO] ${interaction.commandName}:`, e.message, e.stack?.split('\n').slice(0,3).join('\n'));
        const reply = { content: `❌ Erro: ${e.message.slice(0, 1500)}`, ephemeral: true };
        try { if (interaction.replied||interaction.deferred) await interaction.followUp(reply); else await interaction.reply(reply); } catch(_){}
      }
      return;
    }

    // ═══ MODALS ═══
    if (interaction.isModalSubmit()) {
      const cid = interaction.customId;
      if (cid === 'clone_modal') return handleCmdModal(interaction, 'clone');
      if (cid === 'clean_modal') return handleCmdModal(interaction, 'resetar');
      if (cid.startsWith('sell_modal_')) return handleCmdModal(interaction, 'venda');
      if (cid.startsWith('sell_stock_')) return handleStock(interaction, cid);
      if (cid.startsWith('sell_delivery_')) return handleDelivery(interaction, cid);
      if (cid.startsWith('sell_icon_')) return handleIcon(interaction, cid);
      if (cid.startsWith('sell_banner_')) return handleBanner(interaction, cid);
      if (cid.startsWith('sell_display_')) return handleDisplay(interaction, cid);
      if (cid.startsWith('edit_items_')) return handleReplaceStock(interaction, cid);
      if (cid.startsWith('edit_title_')) return handleEditTitle(interaction, cid);
      if (cid.startsWith('edit_desc_')) return handleEditDesc(interaction, cid);
      if (cid.startsWith('edit_price_')) return handleEditPrice(interaction, cid);
      if (cid.startsWith('edit_color_')) return handleEditColor(interaction, cid);
      if (cid.startsWith('config_pix_')) return handleConfigPix(interaction, cid);
      if (cid.startsWith('config_desc_')) return handleConfigDesc(interaction, cid);
    }

    // ═══ BUTTONS ═══
    if (interaction.isButton()) {
      const cid = interaction.customId;
      if (cid.startsWith('sellcfg_')) return handleSellConfigBtn(interaction, cid);
      if (cid.startsWith('buy_')) return handlePurchaseStart(interaction, cid);
      if (cid.startsWith('payconfirm_')) return handlePayConfirm(interaction, cid);
      if (cid.startsWith('paycancel_')) return handlePayCancel(interaction, cid);
      if (cid.startsWith('staffdeliver_')) return handleStaffDeliver(interaction, cid);
      if (cid.startsWith('editcfg_')) return handleEditConfigBtn(interaction, cid);
      if (cid.startsWith('editcfg_update_')) return handleEditUpdate(interaction, cid);
      if (cid.startsWith('config_')) return handleConfigBtn(interaction, cid);
    }

    // ═══ SELECT MENUS ═══
    if (interaction.isStringSelectMenu()) {
      const cid = interaction.customId;
      if (cid.startsWith('sell_thumb_')) return handleThumbToggle(interaction, cid);
      if (cid === 'edit_select_panel') return handleEditSelect(interaction);
      if (cid === 'edit_delete_multi') return handleDeleteMulti(interaction);
    }
  },
};

// ── Utils ──
async function safeReply(i, m) { try { if (i.replied||i.deferred) await i.followUp({content:m,ephemeral:true}); else await i.reply({content:m,ephemeral:true}); } catch(_) {} }
function pid(cid) { return parseInt(cid.split('_').pop()); }

async function handleCmdModal(i, name) {
  const cmd = i.client.commands.get(name);
  if (!cmd?.handleModal) return safeReply(i, 'Erro interno.');
  try { await cmd.handleModal(i); } catch(e) { console.error(`[ERRO] ${name}:`, e.message); await safeReply(i, `Erro: ${e.message.slice(0,200)}`); }
}

// ═══ SELL MODALS ═══
async function handleStock(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.lockStock = i.fields.getTextInputValue('stock_lock').trim().toLowerCase().startsWith('s');
  const raw = i.fields.getTextInputValue('stock_items').trim();
  const items = raw.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s!=='--').join(' -- ').split('--').map(s=>s.trim()).filter(Boolean);
  if (items.length) { addStock(p.id, items); await i.reply({content:`✅ ${items.length} itens.${p.lockStock?' 🔒 Travado.':''}`,ephemeral:true}); }
  else await i.reply({content:'Nenhum item.',ephemeral:true});
}
async function handleDelivery(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.deliveryType = i.fields.getTextInputValue('delivery_type').trim().toLowerCase()==='auto'?'auto':'manual';
  await i.reply({content:`✅ ${p.deliveryType==='auto'?'⚡ Automática':'👤 Manual'}`,ephemeral:true});
}
async function handleIcon(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.iconUrl = i.fields.getTextInputValue('icon_url').trim();
  await i.reply({content:p.iconUrl?'✅ Ícone atualizado.':'✅ Ícone removido.',ephemeral:true});
}
async function handleBanner(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.bannerUrl = i.fields.getTextInputValue('banner_url').trim();
  await i.reply({content:p.bannerUrl?'✅ Banner atualizado.':'✅ Banner removido.',ephemeral:true});
}
async function handleDisplay(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.showStock = i.fields.getTextInputValue('show_stock').trim().toLowerCase().startsWith('s');
  p.showSold = i.fields.getTextInputValue('show_sold').trim().toLowerCase().startsWith('s');
  await i.reply({content:`✅ Estoque: ${p.showStock?'visível':'oculto'} • Vendidos: ${p.showSold?'visível':'oculto'}`,ephemeral:true});
}

// ═══ SELL CONFIG ═══
async function handleSellConfigBtn(i, cid) {
  const pid2 = pid(cid); const p = getPanel(pid2);
  if (!p) return safeReply(i, 'Painel expirado.');
  const act = cid.replace(/sellcfg_/,'').replace(/_\d+$/,'');
  if (act==='stock') return i.showModal(sell.buildStockModal(pid2));
  if (act==='deliv') return i.showModal(sell.buildDeliveryModal(pid2, p.deliveryType));
  if (act==='icon') return i.showModal(sell.buildIconModal(pid2, p.iconUrl));
  if (act==='banner') return i.showModal(sell.buildBannerModal(pid2, p.bannerUrl));
  if (act==='display') return i.showModal(sell.buildDisplayModal(pid2, p));
  if (act==='thumb') { p.showThumbnail=!p.showThumbnail; return i.reply({content:`✅ Thumb: ${p.showThumbnail?'ON':'OFF'}`,ephemeral:true}); }
  if (act==='preview') { const e=buildPanelEmbed(p); e.setTitle(`🔍 Preview — ${p.title}`); return i.reply({embeds:[e],ephemeral:true}); }
  if (act==='pub') {
    if (!p.title||!p.price) return safeReply(i, 'Preencha título e valor.');
    await i.deferReply({ephemeral:true});
    try {
      const ch=i.client.channels.cache.get(p.channelId); if(!ch) return i.followUp({content:'Canal não encontrado.',ephemeral:true});
      const emb=buildPanelEmbed(p); const btn=buildPurchaseButton(p.id,p);
      const msg=await ch.send({embeds:[emb],components:[btn]}); p.messageId=msg.id; p.published=true;
      await i.followUp({content:`✅ Painel #${p.id} publicado em ${ch}.`,ephemeral:true});
    } catch(e) { await i.followUp({content:`Erro: ${e.message}`,ephemeral:true}); }
  }
}
async function handleThumbToggle(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.showThumbnail = i.values[0]!=='none';
  await i.reply({content:`✅ Thumb: ${p.showThumbnail?'ON':'OFF'}`,ephemeral:true});
}

// ═══════════════════════════════════════════════
//  FLUXO DE COMPRA — PASSO 1: Mostrar PIX
// ═══════════════════════════════════════════════

async function handlePurchaseStart(i, cid) {
  const p = getPanel(pid(cid));
  if (!p) return safeReply(i, 'Indisponível.');
  if (!p.published) return safeReply(i, 'Este painel não está mais ativo.');

  // Verifica se tem estoque
  const hasStock = p.lockStock || p.stock.some(s => !s.used);
  if (!hasStock) return safeReply(i, '❌ Estoque esgotado.');

  const config = require('../config');

  const pixEmbed = new EmbedBuilder()
    .setTitle('💳 Pagamento — ' + p.title)
    .setColor(0xF0B232)
    .setDescription(
      `**Produto:** ${p.title}\n` +
      `**Valor:** ${p.price}\n` +
      `**Entrega:** ${p.deliveryType === 'auto' ? '⚡ Automática' : '👤 Manual'}\n\n` +
      `**Chave PIX para pagamento:**\n\`\`\`${config.pixKey || 'PIX não configurado pela staff'}\`\`\`\n` +
      (config.pixQrUrl ? '' : '\n⚠️ O QR Code ainda não foi configurado.')
    )
    .setFooter({ text: 'Após pagar, clique em "Já paguei" para confirmar' });

  if (config.pixQrUrl) pixEmbed.setImage(config.pixQrUrl);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`payconfirm_${p.id}`).setLabel('✅ Já paguei').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`paycancel_${p.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger),
  );

  await i.reply({ embeds: [pixEmbed], components: [buttons], ephemeral: true });
}

// ═══ FLUXO DE COMPRA — PASSO 2: Confirmar pagamento ═══

async function handlePayConfirm(i, cid) {
  const p = getPanel(pid(cid));
  if (!p) return safeReply(i, 'Painel expirado.');

  await i.deferReply({ ephemeral: true });

  if (p.deliveryType === 'auto') {
    // Entrega automática — consome estoque e entrega na hora
    const item = consumeStock(p.id);
    if (!item) return i.followUp({ content: '❌ Estoque esgotado durante o pagamento. Avise a staff.', ephemeral: true });

    // Atualiza painel publicado
    if (p.published && p.messageId) {
      try {
        const ch = i.client.channels.cache.get(p.channelId);
        const msg = await ch?.messages.fetch(p.messageId).catch(() => null);
        if (msg) await msg.edit({ embeds: [buildPanelEmbed(p)], components: [buildPurchaseButton(p.id, p)] });
      } catch (_) {}
    }

    const emb = new EmbedBuilder()
      .setTitle('🎁 Pagamento Confirmado — Entrega Automática')
      .setColor(0x57f287)
      .setDescription(`**${p.title}**\n\nPagamento confirmado! Aqui está seu produto:`)
      .addFields({ name: '📦 Conteúdo', value: item.slice(0, 1024) })
      .setFooter({ text: `Venda #${p.soldCount} • Obrigado por comprar!` }).setTimestamp();

    return i.followUp({ embeds: [emb], ephemeral: true });
  }

  // Entrega manual — notifica staff
  const notifEmbed = new EmbedBuilder()
    .setTitle('🔔 Pagamento Confirmado — Aguardando Entrega')
    .setColor(0x5865F2)
    .setDescription(
      `**${p.title}**\n**Valor:** ${p.price}\n**Comprador:** ${i.user} (${i.user.id})\n\n` +
      `⏳ A staff precisa confirmar a entrega manualmente.`
    )
    .setFooter({ text: `Painel #${p.id}` }).setTimestamp();

  // Se tem canal do painel, envia notificação lá
  if (p.channelId) {
    try {
      const ch = i.client.channels.cache.get(p.channelId);
      if (ch) {
        const staffRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`staffdeliver_${p.id}`).setLabel('📦 Confirmar Entrega').setStyle(ButtonStyle.Success),
        );
        await ch.send({ content: `⚠️ **Novo pagamento!** ${i.user} comprou **${p.title}**.`, embeds: [notifEmbed], components: [staffRow] });
      }
    } catch (_) {}
  }

  p.soldCount++;
  return i.followUp({ content: '✅ Pagamento registrado! A staff fará a entrega em breve.', ephemeral: true });
}

async function handlePayCancel(i, cid) {
  await i.update({ content: '❌ Compra cancelada.', embeds: [], components: [] });
}

// ═══ STAFF DELIVER ═══

async function handleStaffDeliver(i, cid) {
  const p = getPanel(pid(cid));
  if (!p) return safeReply(i, 'Painel expirado.');

  if (!i.memberPermissions?.has('Administrator')) {
    return safeReply(i, 'Apenas staff pode confirmar entregas.');
  }

  const item = consumeStock(p.id);
  if (!item) return safeReply(i, '❌ Estoque esgotado.');

  // Atualiza painel
  if (p.published && p.messageId) {
    try {
      const ch = i.client.channels.cache.get(p.channelId);
      const msg = await ch?.messages.fetch(p.messageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [buildPanelEmbed(p)], components: [buildPurchaseButton(p.id, p)] });
    } catch (_) {}
  }

  await i.update({ content: `✅ Entrega do painel #${p.id} confirmada.\n\`\`\`${item.slice(0, 1000)}\`\`\``, embeds: [], components: [] });
}

// ═══ PURCHASE (antigo — mantido para compatibilidade) ═══
async function handlePurchase(i, cid) {
  return handlePurchaseStart(i, cid);
}

// ═══ EDIT MODALS ═══
async function handleReplaceStock(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  const raw = i.fields.getTextInputValue('replace_items').trim();
  if (raw) {
    p.stock = [];
    const items = raw.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s!=='--').join(' -- ').split('--').map(s=>s.trim()).filter(Boolean);
    addStock(p.id, items);
    await i.reply({content:`✅ Estoque: ${items.length} itens.`,ephemeral:true});
  } else { await i.reply({content:'Estoque mantido.',ephemeral:true}); }
}
async function handleEditTitle(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.title = i.fields.getTextInputValue('new_title').trim();
  await i.reply({content:`✅ Título: **${p.title}**`,ephemeral:true});
}
async function handleEditDesc(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.description = i.fields.getTextInputValue('new_desc').trim();
  await i.reply({content:'✅ Descrição atualizada.',ephemeral:true});
}
async function handleEditPrice(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.price = i.fields.getTextInputValue('new_price').trim();
  await i.reply({content:`✅ Valor: **${p.price}**`,ephemeral:true});
}
async function handleEditColor(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Painel expirado.');
  p.color = resolveColor(i.fields.getTextInputValue('new_color').trim());
  await i.reply({content:`✅ Cor: ${p.color}`,ephemeral:true});
}

// ═══ EDIT CONFIG ═══
async function handleEditConfigBtn(i, cid) {
  const pid2 = pid(cid); const p = getPanel(pid2);
  if (!p) return safeReply(i, 'Painel expirado.');
  if (cid.startsWith('editcfg_stock_')) return i.showModal(sell.buildStockModal(pid2));
  if (cid.startsWith('editcfg_deliv_')) return i.showModal(sell.buildDeliveryModal(pid2, p.deliveryType));
  if (cid.startsWith('editcfg_icon_')) return i.showModal(sell.buildIconModal(pid2, p.iconUrl));
  if (cid.startsWith('editcfg_banner_')) return i.showModal(sell.buildBannerModal(pid2, p.bannerUrl));
  if (cid.startsWith('editcfg_display_')) return i.showModal(sell.buildDisplayModal(pid2, p));
  if (cid.startsWith('editcfg_thumb_')) { p.showThumbnail=!p.showThumbnail; return i.reply({content:`✅ Thumb: ${p.showThumbnail?'ON':'OFF'}`,ephemeral:true}); }
  if (cid.startsWith('editcfg_items_')) return i.showModal(new ModalBuilder().setCustomId(`edit_items_${pid2}`).setTitle('Substituir Estoque').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('replace_items').setLabel('Novos itens (um por linha, --)').setPlaceholder('item1\n--\nitem2').setStyle(2).setRequired(false).setMaxLength(2000))));
  if (cid.startsWith('editcfg_title_')) return i.showModal(new ModalBuilder().setCustomId(`edit_title_${pid2}`).setTitle('Editar Título').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_title').setLabel('Novo título').setStyle(1).setRequired(true).setMaxLength(256).setValue(p.title))));
  if (cid.startsWith('editcfg_desc_')) return i.showModal(new ModalBuilder().setCustomId(`edit_desc_${pid2}`).setTitle('Editar Descrição').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_desc').setLabel('Nova descrição').setStyle(2).setRequired(true).setMaxLength(2000).setValue(p.description))));
  if (cid.startsWith('editcfg_price_')) return i.showModal(new ModalBuilder().setCustomId(`edit_price_${pid2}`).setTitle('Editar Valor').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_price').setLabel('Novo valor').setStyle(1).setRequired(true).setMaxLength(60).setValue(p.price))));
  if (cid.startsWith('editcfg_color_')) return i.showModal(new ModalBuilder().setCustomId(`edit_color_${pid2}`).setTitle('Editar Cor').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_color').setLabel('Cor (HEX ou nome)').setStyle(1).setRequired(false).setMaxLength(32).setValue(p.color))));
  if (cid.startsWith('editcfg_delete_')) { deletePanel(pid2); return i.reply({content:`🗑️ Painel #${pid2} "${p.title}" deletado.`,ephemeral:true}); }
}

// ═══ EDIT — ATUALIZAR PUBLICAÇÃO ═══
async function handleEditUpdate(i, cid) {
  const pid2 = pid(cid); const p = getPanel(pid2);
  if (!p) return safeReply(i, 'Painel expirado.');
  if (!p.published || !p.messageId) return safeReply(i, 'Este painel não está publicado.');
  await i.deferReply({ephemeral:true});
  try {
    const ch = i.client.channels.cache.get(p.channelId);
    if (!ch) return i.followUp({content:'Canal não encontrado.',ephemeral:true});
    const msg = await ch.messages.fetch(p.messageId).catch(() => null);
    if (!msg) return i.followUp({content:'Mensagem original não encontrada. Republique o painel.',ephemeral:true});
    const emb = buildPanelEmbed(p);
    const btn = buildPurchaseButton(p.id, p);
    await msg.edit({embeds:[emb],components:[btn]});
    await i.followUp({content:`✅ Painel #${p.id} atualizado em ${ch}.`,ephemeral:true});
  } catch(e) { await i.followUp({content:`Erro: ${e.message}`,ephemeral:true}); }
}

// ═══ SELECT MENUS ═══
async function handleEditSelect(i) {
  const val = i.values[0];
  if (!val.startsWith('panel_')) return safeReply(i, 'Seleção inválida.');
  const panelId = parseInt(val.replace('panel_', ''));
  const p = getPanel(panelId);
  if (!p) return safeReply(i, 'Painel não encontrado.');
  await showEditMenu(i, p);
}

async function handleDeleteMulti(i) {
  const ids = i.values.filter(v => v.startsWith('delete_')).map(v => parseInt(v.replace('delete_', '')));
  if (!ids.length) return safeReply(i, 'Nenhum selecionado.');
  let deleted = 0;
  for (const id of ids) { if (deletePanel(id)) deleted++; }
  await i.reply({content:`🗑️ ${deleted} painel(is) deletado(s).`,ephemeral:true});
}

// ═══ /config handlers ═══
async function handleConfigBtn(i, cid) {
  const act = cid.replace('config_','');
  if (act === 'pix') return i.showModal(new ModalBuilder().setCustomId('config_pix_main').setTitle('Configurar PIX').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pix_key').setLabel('Chave PIX').setPlaceholder('Sua chave PIX (CPF/CNPJ/email/telefone)').setStyle(1).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pix_qr').setLabel('URL do QR Code (opcional)').setPlaceholder('https://i.imgur.com/...').setStyle(1).setRequired(false).setMaxLength(400)),
  ));
  if (act === 'desc') return i.showModal(new ModalBuilder().setCustomId('config_desc_main').setTitle('Descrição do Bot').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bot_desc').setLabel('Descrição do perfil').setPlaceholder('Clona-Me • O melhor bot de clone e marketplace').setStyle(2).setRequired(false).setMaxLength(400)),
  ));
}

async function handleConfigPix(i, cid) {
  const key = i.fields.getTextInputValue('pix_key').trim();
  const qr = i.fields.getTextInputValue('pix_qr')?.trim() || '';
  const config = require('../config');
  config.pixKey = key;
  config.pixQrUrl = qr;
  await i.reply({content:`✅ PIX configurado!\nChave: \`${key}\`${qr?'\nQR Code: ✅':''}`,ephemeral:true});
}

async function handleConfigDesc(i, cid) {
  const desc = i.fields.getTextInputValue('bot_desc').trim();
  try {
    await i.client.user.setPresence({
      activities: [{ name: desc || 'Clona-Me • discord.gg/hykfavEur', type: 4 }]
    });
  } catch(_){}
  await i.reply({content:'✅ Descrição do bot atualizada.',ephemeral:true});
}
