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
      catch (e) { console.error(`[ERRO] ${interaction.commandName}:`, e); await safeReply(interaction, 'Erro ao executar.'); }
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
    }

    // ═══ BUTTONS ═══
    if (interaction.isButton()) {
      const cid = interaction.customId;
      if (cid.startsWith('sellcfg_')) return handleSellConfigBtn(interaction, cid);
      if (cid.startsWith('buy_')) return handlePurchase(interaction, cid);
      if (cid.startsWith('editcfg_')) return handleEditConfigBtn(interaction, cid);
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
  try { await cmd.handleModal(i); } catch(e) { console.error(`[ERRO] ${name}:`,e); await safeReply(i, 'Erro.'); }
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

// ═══ PURCHASE ═══
async function handlePurchase(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Indisponível.');
  await i.deferReply({ephemeral:true});
  const item = consumeStock(p.id);
  if (!item) return i.followUp({content:'❌ Estoque esgotado. Avise a staff.',ephemeral:true});
  if (p.published && p.messageId) {
    try { const ch=i.client.channels.cache.get(p.channelId); const msg=await ch?.messages.fetch(p.messageId).catch(()=>null);
      if(msg) await msg.edit({embeds:[buildPanelEmbed(p)],components:[buildPurchaseButton(p.id,p)]}); } catch(_){}
  }
  const emb = new EmbedBuilder().setTitle(p.deliveryType==='auto'?'🎁 Entrega Automática':'🛒 Compra Realizada').setColor(0x57f287)
    .setDescription(`**${p.title}**\n${p.deliveryType==='auto'?'Aqui está seu produto:':'A staff fará a entrega.'}`)
    .addFields({name:p.deliveryType==='auto'?'📦 Conteúdo':'⏳ Aguarde',value:item.slice(0,1024)})
    .setFooter({text:`Venda #${p.soldCount} • Clona-Me`}).setTimestamp();
  await i.followUp({embeds:[emb],ephemeral:true});
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
  const { ModalBuilder, ActionRowBuilder, TextInputBuilder } = require('discord.js');
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
