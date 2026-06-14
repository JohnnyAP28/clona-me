const { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } = require('discord.js');
const { getPanel, buildPanelEmbed, buildPurchaseButton, addStock, consumeStock, resolveColor, listPanels, deletePanel } = require('../utils/sellManager');
const sell = require('../commands/sell');
const { showEditMenu } = require('../commands/edit');

function downloadImage(url) {
  if (typeof fetch !== 'undefined') {
    return fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); }).then(b => Buffer.from(b));
  }
  const mod = url.startsWith('https') ? require('node:https') : require('node:http');
  return new Promise((resolve, reject) => {
    mod.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// Re-exibe painel de config (auto-save visual)
async function refreshConfig(i, panel) {
  const embed = buildPanelEmbed(panel);
  embed.setTitle('🔧 Configurar Painel — Preview');
  embed.setDescription((panel.description || '') + '\n\n⚠️ Tudo salvo automaticamente. Quando pronto, clique em **Publicar Agora**.');
  await i.update({ embeds: [embed], components: sell.buildConfigRows(panel) });
}

// Re-exibe menu de edição (auto-save visual)
async function refreshEditMenu(i, panel) {
  const embed = buildPanelEmbed(panel);
  embed.setTitle(`✏️ Editando Painel #${panel.id}`);
  embed.setDescription((panel.description || '') + '\n\n⚠️ Alterações salvas automaticamente.');
  const { ButtonBuilder, ButtonStyle } = require('discord.js');
  const r1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_title_${panel.id}`).setLabel('📝 Título').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`editcfg_desc_${panel.id}`).setLabel('📄 Descrição').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`editcfg_price_${panel.id}`).setLabel('💰 Valor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`editcfg_color_${panel.id}`).setLabel('🎨 Cor').setStyle(ButtonStyle.Primary),
  );
  const r2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_stock_${panel.id}`).setLabel('📦 Estoque').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_items_${panel.id}`).setLabel('🔄 Substituir').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_deliv_${panel.id}`).setLabel('📨 Entrega').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_icon_${panel.id}`).setLabel('🖼️ Ícone').setStyle(ButtonStyle.Secondary),
  );
  const r3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_banner_${panel.id}`).setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_display_${panel.id}`).setLabel('👁️ Exibição').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_thumb_${panel.id}`).setLabel(`📌 Thumb: ${panel.showThumbnail ? 'ON' : 'OFF'}`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_delete_${panel.id}`).setLabel('🗑️ Deletar').setStyle(ButtonStyle.Danger),
  );
  const r4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_update_${panel.id}`).setLabel('🔄 Atualizar Publicação').setStyle(ButtonStyle.Success),
  );
  await i.update({ embeds: [embed], components: [r1, r2, r3, r4] });
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) { console.error(`[ERRO] Cmd: ${interaction.commandName}`); return; }
      try { await cmd.execute(interaction); }
      catch (e) { console.error(`[ERRO] ${interaction.commandName}:`, e.message);
        const reply = { content: `❌ Erro: ${e.message.slice(0,1500)}`, ephemeral: true };
        try { if (interaction.replied||interaction.deferred) await interaction.followUp(reply); else await interaction.reply(reply); } catch(_){} }
      return;
    }
    if (interaction.isModalSubmit()) {
      const cid = interaction.customId;
      if (cid==='clone_modal') return handleCmdModal(interaction,'clone');
      if (cid==='clean_modal') return handleCmdModal(interaction,'resetar');
      if (cid.startsWith('sell_modal_')) return handleCmdModal(interaction,'venda');
      if (cid.startsWith('sell_stock_')) return handleStock(interaction,cid);
      if (cid.startsWith('sell_delivery_')) return handleDelivery(interaction,cid);
      if (cid.startsWith('sell_icon_')) return handleIcon(interaction,cid);
      if (cid.startsWith('sell_banner_')) return handleBanner(interaction,cid);
      if (cid.startsWith('sell_display_')) return handleDisplay(interaction,cid);
      if (cid.startsWith('edit_items_')) return handleReplaceStock(interaction,cid);
      if (cid.startsWith('edit_title_')) return handleEditTitle(interaction,cid);
      if (cid.startsWith('edit_desc_')) return handleEditDesc(interaction,cid);
      if (cid.startsWith('edit_price_')) return handleEditPrice(interaction,cid);
      if (cid.startsWith('edit_color_')) return handleEditColor(interaction,cid);
      if (cid==='config_pix_main') return handleConfigPix(interaction);
      if (cid==='config_desc_main') return handleConfigDesc(interaction);
      if (cid==='config_avatar_main') return handleConfigAvatar(interaction);
      if (cid==='config_banner_main') return handleConfigBanner(interaction);
    }
    if (interaction.isButton()) {
      const cid = interaction.customId;
      if (cid.startsWith('sellcfg_')) return handleSellConfigBtn(interaction,cid);
      if (cid.startsWith('buy_')) return handlePurchaseStart(interaction,cid);
      if (cid.startsWith('payconfirm_')) return handlePayConfirm(interaction,cid);
      if (cid.startsWith('paycancel_')) return handlePayCancel(interaction,cid);
      if (cid.startsWith('paycopy_')) return handlePayCopy(interaction,cid);
      if (cid.startsWith('staffverify_')) return handleStaffVerify(interaction,cid);
      if (cid.startsWith('staffdeliver_')) return handleStaffVerify(interaction,cid);
      if (cid.startsWith('staffreject_')) return handleStaffReject(interaction,cid);
      if (cid.startsWith('editcfg_')) return handleEditConfigBtn(interaction,cid);
      if (cid.startsWith('editcfg_update_')) return handleEditUpdate(interaction,cid);
      if (cid.startsWith('config_')) return handleConfigBtn(interaction,cid);
    }
    if (interaction.isStringSelectMenu()) {
      const cid = interaction.customId;
      if (cid.startsWith('sell_thumb_')) return handleThumbToggle(interaction,cid);
      if (cid==='edit_select_panel') return handleEditSelect(interaction);
      if (cid==='edit_delete_multi') return handleDeleteMulti(interaction);
    }
  },
};

async function safeReply(i, m) { try { if (i.replied||i.deferred) await i.followUp({content:m,ephemeral:true}); else await i.reply({content:m,ephemeral:true}); } catch(_) {} }
function pid(cid) { return parseInt(cid.split('_').pop()); }
async function handleCmdModal(i, name) { const cmd=i.client.commands.get(name); if(!cmd?.handleModal) return safeReply(i,'Erro interno.'); try{await cmd.handleModal(i);}catch(e){console.error(`[ERRO] ${name}:`,e.message); await safeReply(i,`Erro: ${e.message.slice(0,200)}`);} }

// ═══ SELL MODALS — auto-save visual ═══
async function handleStock(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.lockStock=i.fields.getTextInputValue('stock_lock').trim().toLowerCase().startsWith('s'); const raw=i.fields.getTextInputValue('stock_items').trim(); const items=raw.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s!=='--').join(' -- ').split('--').map(s=>s.trim()).filter(Boolean); if(items.length) addStock(p.id,items); await refreshConfig(i,p); }
async function handleDelivery(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.deliveryType=i.fields.getTextInputValue('delivery_type').trim().toLowerCase()==='auto'?'auto':'manual'; await refreshConfig(i,p); }
async function handleIcon(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.iconUrl=i.fields.getTextInputValue('icon_url').trim(); await refreshConfig(i,p); }
async function handleBanner(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.bannerUrl=i.fields.getTextInputValue('banner_url').trim(); await refreshConfig(i,p); }
async function handleDisplay(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.showStock=i.fields.getTextInputValue('show_stock').trim().toLowerCase().startsWith('s'); p.showSold=i.fields.getTextInputValue('show_sold').trim().toLowerCase().startsWith('s'); await refreshConfig(i,p); }
async function handleThumbToggle(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.showThumbnail=i.values[0]!=='none'; await refreshConfig(i,p); }

async function handleSellConfigBtn(i, cid) {
  const pid2=pid(cid); const p=getPanel(pid2); if(!p) return safeReply(i,'Painel expirado.');
  const act=cid.replace(/sellcfg_/,'').replace(/_\d+$/,'');
  if(act==='stock') return i.showModal(sell.buildStockModal(pid2));
  if(act==='deliv') return i.showModal(sell.buildDeliveryModal(pid2,p.deliveryType));
  if(act==='icon') return i.showModal(sell.buildIconModal(pid2,p.iconUrl));
  if(act==='banner') return i.showModal(sell.buildBannerModal(pid2,p.bannerUrl));
  if(act==='display') return i.showModal(sell.buildDisplayModal(pid2,p));
  if(act==='thumb') return i.reply({content:'Escolha:',components:[new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`sell_thumb_${pid2}`).setPlaceholder('Thumbnail').addOptions(new StringSelectMenuOptionBuilder().setLabel('ON').setValue('top').setDefault(p.showThumbnail),new StringSelectMenuOptionBuilder().setLabel('OFF').setValue('none').setDefault(!p.showThumbnail)))],ephemeral:true});
  if(act==='preview'){const e=buildPanelEmbed(p); e.setTitle(`🔍 Preview — ${p.title}`); return i.reply({embeds:[e],ephemeral:true});}
  if(act==='pub'){
    if(!p.title||!p.price) return safeReply(i,'Preencha título e valor.');
    await i.deferReply({ephemeral:true});
    try{const ch=i.client.channels.cache.get(p.channelId); if(!ch) return i.followUp({content:'❌ Canal não encontrado.',ephemeral:true});
      const emb=buildPanelEmbed(p); const btn=buildPurchaseButton(p.id,p);
      const msg=await ch.send({embeds:[emb],components:[btn]}); p.messageId=msg.id; p.published=true;
      await i.followUp({content:`✅ Painel #${p.id} publicado em ${ch}.`,ephemeral:true});
    }catch(e){await i.followUp({content:`❌ Erro: ${e.message}`,ephemeral:true});}
  }
}

// ═══ FLUXO DE COMPRA COM CARRINHO ═══
const activeCarts = new Map();

async function createCartChannel(guild, buyer, panel) {
  try {
    let cartCategory = guild.channels.cache.find(c => c.type === 4 && c.name === '🛒・Carrinhos');
    if (!cartCategory) {
      cartCategory = await guild.channels.create({
        name: '🛒・Carrinhos', type: 4,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        ],
      });
    }
    const channelName = `🛒・carrinho-${buyer.username}`.slice(0, 32);
    return await guild.channels.create({
      name: channelName, type: 0, parent: cartCategory.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: buyer.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
      ],
    });
  } catch (e) { console.error('[CART] Erro:', e.message); return null; }
}

async function closeCartChannel(guild, buyerId) {
  try {
    const channel = guild.channels.cache.find(c => c.name.includes('carrinho-') && c.permissionOverwrites.cache.has(buyerId));
    if (channel) {
      await channel.permissionOverwrites.edit(buyerId, { ViewChannel: false });
      setTimeout(async () => { try { await channel.delete('Compra finalizada'); } catch (_) {} }, 5000);
    }
  } catch (_) {}
}

async function handlePurchaseStart(i, cid) {
  const p = getPanel(pid(cid)); if (!p) return safeReply(i, 'Indisponível.');
  if (!p.published) return safeReply(i, 'Painel não disponível.');
  if (!p.lockStock && !p.stock.some(s => !s.used)) return safeReply(i, '❌ Estoque esgotado.');
  const config = require('../config');
  const pixKey = config.pixKey || '(não configurado)';
  await i.deferReply({ ephemeral: true });
  const cartChannel = await createCartChannel(i.guild, i.user, p);
  if (!cartChannel) return i.followUp({ content: '❌ Erro ao criar carrinho.', ephemeral: true });
  activeCarts.set(p.id, { buyerId: i.user.id, channelId: cartChannel.id });
  const cartEmbed = new EmbedBuilder().setTitle('🛒 Carrinho de Compras').setColor(0x5865F2)
    .setDescription(`${i.user}, continue sua compra aqui!\n\n**Produto:** ${p.title}\n**Valor:** ${p.price}\n**Entrega:** ${p.deliveryType==='auto'?'⚡ Automática':'👤 Manual'}\n\n**Chave PIX:**\n\`\`\`${pixKey}\`\`\``)
    .setFooter({text:'Após pagar, clique em "Já paguei"'});
  if (config.pixQrUrl) cartEmbed.setImage(config.pixQrUrl);
  try { await cartChannel.send({ embeds: [cartEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`paycopy_${p.id}`).setLabel('📋 Copiar PIX').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId(`payconfirm_${p.id}`).setLabel('✅ Já paguei').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`paycancel_${p.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger))] }); } catch (_) {}
  // Sem menção ao DM — só o atalho do carrinho
  await i.followUp({ content: `🛒 **Carrinho criado!** Continue sua compra no canal: ${cartChannel}`, ephemeral: true });
}
async function handlePayCopy(i, cid) { const config=require('../config'); await i.reply({content:config.pixKey||'PIX não configurado',ephemeral:true}); }
async function handlePayConfirm(i, cid) {
  const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.');
  await i.deferReply({ephemeral:true});
  const buyerId=i.user.id;
  const cart=activeCarts.get(p.id);
  const notifyCh = cart?.channelId ? i.guild.channels.cache.get(cart.channelId) : (p.channelId ? i.client.channels.cache.get(p.channelId) : null);
  if (notifyCh) {
    try {
      await notifyCh.send({embeds:[new EmbedBuilder().setTitle('🔔 Pagamento Pendente').setColor(0xF0B232).setDescription(`**Produto:** ${p.title}\n**Valor:** ${p.price}\n**Comprador:** <@${buyerId}>\n\n⚠️ Verifique antes de confirmar.`).setFooter({text:`Painel #${p.id}`}).setTimestamp()],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`staffverify_${p.id}_${buyerId}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`staffreject_${p.id}_${buyerId}`).setLabel('❌ Rejeitar').setStyle(ButtonStyle.Danger))]});
    } catch (_) {}
  }
  await i.followUp({content:'✅ Pagamento registrado! A staff verificará em instantes.',ephemeral:true});
}
async function handleStaffVerify(i, cid) {
  if(!i.memberPermissions?.has('Administrator')) return safeReply(i,'Apenas staff.');
  const parts=cid.split('_'); const panelId=parseInt(parts[1]); const buyerId=parts[2];
  const p=getPanel(panelId); if(!p) return safeReply(i,'Painel expirado.');
  await i.deferUpdate();
  const item=consumeStock(p.id);
  if(!item){await i.editReply({content:'❌ Estoque esgotado.',embeds:[],components:[]});return;}
  if(p.published&&p.messageId){try{const ch=i.client.channels.cache.get(p.channelId);const msg=await ch?.messages.fetch(p.messageId).catch(()=>null);if(msg)await msg.edit({embeds:[buildPanelEmbed(p)],components:[buildPurchaseButton(p.id,p)]});}catch(_){}}
  const dmLink='https://discord.com/channels/@me';
  let dmSent=false;
  try{const buyer=await i.client.users.fetch(buyerId).catch(()=>null);if(buyer){await buyer.send({embeds:[new EmbedBuilder().setTitle('🎁 Produto Entregue!').setColor(0x57f287).setDescription(`**${p.title}**\n\nSeu pagamento foi confirmado! Aqui está seu produto:`).addFields({name:'📦 Conteúdo',value:item.slice(0,1024)}).setFooter({text:'PRIMO Store • Obrigado por comprar!'}).setTimestamp()]}).catch(()=>{});dmSent=true;}}catch(_){}
  await closeCartChannel(i.guild,buyerId); activeCarts.delete(p.id);
  await i.editReply({content:null,embeds:[new EmbedBuilder().setTitle('🎉 Parabéns pela compra! 🎉').setColor(0x57f287).setDescription(`<@${buyerId}>, seu produto foi entregue com sucesso!\n\n📬 **Acesse seu DM:** [Clique aqui para abrir](${dmLink})\n🛒 O carrinho foi fechado automaticamente.`).setFooter({text:`Painel #${p.id} • Confirmado por ${i.user.username}`}).setTimestamp()],components:[]});
}
async function handleStaffReject(i, cid) {
  if(!i.memberPermissions?.has('Administrator')) return safeReply(i,'Apenas staff.');
  const parts=cid.split('_'); const panelId=parseInt(parts[1]); const buyerId=parts[2];
  await closeCartChannel(i.guild,buyerId); activeCarts.delete(panelId);
  await i.update({content:`❌ Pagamento do painel #${panelId} de <@${buyerId}> rejeitado.`,embeds:[],components:[]});
}
async function handlePayCancel(i, cid) { const panelId=pid(cid); const cart=activeCarts.get(panelId); if(cart){await closeCartChannel(i.guild,cart.buyerId);activeCarts.delete(panelId);} await i.update({content:'❌ Compra cancelada.',embeds:[],components:[]}); }
async function handlePurchase(i, cid) { return handlePurchaseStart(i, cid); }

// ═══ EDIT MODALS — auto-save visual (re-exibe menu de edição) ═══
async function handleReplaceStock(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); const raw=i.fields.getTextInputValue('replace_items').trim(); if(raw){p.stock=[]; const items=raw.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s!=='--').join(' -- ').split('--').map(s=>s.trim()).filter(Boolean); addStock(p.id,items);} await refreshEditMenu(i,p); }
async function handleEditTitle(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.title=i.fields.getTextInputValue('new_title').trim(); await refreshEditMenu(i,p); }
async function handleEditDesc(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.description=i.fields.getTextInputValue('new_desc').trim(); await refreshEditMenu(i,p); }
async function handleEditPrice(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.price=i.fields.getTextInputValue('new_price').trim(); await refreshEditMenu(i,p); }
async function handleEditColor(i, cid) { const p=getPanel(pid(cid)); if(!p) return safeReply(i,'Painel expirado.'); p.color=resolveColor(i.fields.getTextInputValue('new_color').trim()); await refreshEditMenu(i,p); }
async function handleEditConfigBtn(i, cid) { const pid2=pid(cid),p=getPanel(pid2); if(!p) return safeReply(i,'Painel expirado.'); if(cid.startsWith('editcfg_stock_'))return i.showModal(sell.buildStockModal(pid2)); if(cid.startsWith('editcfg_deliv_'))return i.showModal(sell.buildDeliveryModal(pid2,p.deliveryType)); if(cid.startsWith('editcfg_icon_'))return i.showModal(sell.buildIconModal(pid2,p.iconUrl)); if(cid.startsWith('editcfg_banner_'))return i.showModal(sell.buildBannerModal(pid2,p.bannerUrl)); if(cid.startsWith('editcfg_display_'))return i.showModal(sell.buildDisplayModal(pid2,p)); if(cid.startsWith('editcfg_thumb_')){p.showThumbnail=!p.showThumbnail; return i.reply({content:`✅ Thumb: ${p.showThumbnail?'ON':'OFF'}`,ephemeral:true});} if(cid.startsWith('editcfg_items_'))return i.showModal(new ModalBuilder().setCustomId(`edit_items_${pid2}`).setTitle('⚠️ Substituir Estoque').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('replace_items').setLabel('Novos itens (um por linha, --)').setPlaceholder('item1\n--\nitem2').setStyle(2).setRequired(false).setMaxLength(2000)))); if(cid.startsWith('editcfg_title_'))return i.showModal(new ModalBuilder().setCustomId(`edit_title_${pid2}`).setTitle('⚠️ Editar Título').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_title').setLabel('Novo título').setStyle(1).setRequired(true).setMaxLength(256).setValue(p.title)))); if(cid.startsWith('editcfg_desc_'))return i.showModal(new ModalBuilder().setCustomId(`edit_desc_${pid2}`).setTitle('⚠️ Editar Descrição').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_desc').setLabel('Nova descrição').setStyle(2).setRequired(true).setMaxLength(2000).setValue(p.description)))); if(cid.startsWith('editcfg_price_'))return i.showModal(new ModalBuilder().setCustomId(`edit_price_${pid2}`).setTitle('⚠️ Editar Valor').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_price').setLabel('Novo valor').setStyle(1).setRequired(true).setMaxLength(60).setValue(p.price)))); if(cid.startsWith('editcfg_color_'))return i.showModal(new ModalBuilder().setCustomId(`edit_color_${pid2}`).setTitle('⚠️ Editar Cor').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_color').setLabel('Cor (HEX ou nome)').setStyle(1).setRequired(false).setMaxLength(32).setValue(p.color)))); if(cid.startsWith('editcfg_delete_')){deletePanel(pid2); return i.reply({content:`🗑️ Painel #${pid2} "${p.title}" deletado.`,ephemeral:true});} }
async function handleEditUpdate(i, cid) { const pid2=pid(cid),p=getPanel(pid2); if(!p) return safeReply(i,'Painel não encontrado.'); if(!p.published) return safeReply(i,'⚠️ Não publicado. Use Publicar Agora.'); if(!p.messageId) return safeReply(i,'⚠️ ID perdido. Republique.'); await i.deferReply({ephemeral:true}); try{const ch=i.client.channels.cache.get(p.channelId); if(!ch) return i.followUp({content:'❌ Canal não encontrado.',ephemeral:true}); const msg=await ch.messages.fetch(p.messageId).catch(()=>null); if(!msg){p.messageId=null; p.published=false; return i.followUp({content:'❌ Mensagem original perdida. Use Publicar Agora.',ephemeral:true});} await msg.edit({embeds:[buildPanelEmbed(p)],components:[buildPurchaseButton(p.id,p)]}); await i.followUp({content:`✅ Painel #${p.id} atualizado!`,ephemeral:true});} catch(e){await i.followUp({content:`❌ Erro: ${e.message}`,ephemeral:true});} }
async function handleEditSelect(i) { const val=i.values[0]; if(!val.startsWith('panel_')) return safeReply(i,'Inválido.'); const panelId=parseInt(val.replace('panel_','')); const p=getPanel(panelId); if(!p) return safeReply(i,'Não encontrado.'); await showEditMenu(i,p); }
async function handleDeleteMulti(i) { const ids=i.values.filter(v=>v.startsWith('delete_')).map(v=>parseInt(v.replace('delete_',''))); if(!ids.length) return safeReply(i,'Nenhum.'); let d=0; for(const id of ids){if(deletePanel(id))d++;} await i.reply({content:`🗑️ ${d} painel(is) deletado(s).`,ephemeral:true}); }

// ═══ /config — auto-save ═══
async function handleConfigBtn(i, cid) {
  const act=cid.replace('config_','');
  if(act==='pix') return i.showModal(new ModalBuilder().setCustomId('config_pix_main').setTitle('⚠️ Configurar PIX — Salve antes de enviar').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pix_key').setLabel('Chave PIX').setPlaceholder('CPF/CNPJ/email/telefone').setStyle(1).setRequired(true).setMaxLength(100)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pix_qr').setLabel('URL do QR Code (opcional)').setPlaceholder('https://i.imgur.com/...').setStyle(1).setRequired(false).setMaxLength(400))));
  if(act==='desc') return i.showModal(new ModalBuilder().setCustomId('config_desc_main').setTitle('⚠️ Descrição do Bot').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bot_desc').setLabel('Descrição do perfil').setPlaceholder('O melhor bot de marketplace').setStyle(2).setRequired(false).setMaxLength(400))));
  if(act==='avatar') return i.showModal(new ModalBuilder().setCustomId('config_avatar_main').setTitle('⚠️ Avatar do Bot').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('avatar_url').setLabel('URL da imagem do avatar').setPlaceholder('https://i.imgur.com/...').setStyle(1).setRequired(true).setMaxLength(400))));
  if(act==='banner') return i.showModal(new ModalBuilder().setCustomId('config_banner_main').setTitle('⚠️ Banner do Bot').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner_url').setLabel('URL da imagem do banner').setPlaceholder('https://i.imgur.com/...').setStyle(1).setRequired(true).setMaxLength(400))));
}
async function handleConfigPix(i) { const key=i.fields.getTextInputValue('pix_key').trim(); const qr=i.fields.getTextInputValue('pix_qr')?.trim()||''; const config=require('../config'); config.pixKey=key; config.pixQrUrl=qr; const embed=new EmbedBuilder().setTitle('⚙️ Configuração do Bot').setColor(0x5865F2).setDescription(`**PIX:** \`${key.slice(0,30)}...\`\n**QR Code:** ${qr?'✅ Configurado':'❌ Não configurado'}\n**Link:** ${config.serverInvite}\n\n⚠️ Salvo automaticamente!`); await i.update({embeds:[embed],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('config_pix').setLabel('💳 PIX').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('config_avatar').setLabel('🖼️ Avatar').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_banner').setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_desc').setLabel('📝 Descrição').setStyle(ButtonStyle.Secondary))]}); }
async function handleConfigDesc(i) { const desc=i.fields.getTextInputValue('bot_desc')?.trim()||'Clona-Me • discord.gg/hykfavEur'; try{await i.client.user.setPresence({activities:[{name:desc,type:4}]});}catch(e){console.error('[CONFIG] Desc:',e.message);} await i.reply({content:'✅ Descrição do bot atualizada.',ephemeral:true}); }
async function handleConfigAvatar(i) { const url=i.fields.getTextInputValue('avatar_url').trim(); if(!url) return safeReply(i,'URL obrigatória.'); await i.deferReply({ephemeral:true}); try{const buf=await downloadImage(url); await i.client.user.setAvatar(buf); await i.followUp({content:'✅ Avatar do bot atualizado!',ephemeral:true});} catch(e){await i.followUp({content:`❌ Erro: ${e.message}`,ephemeral:true});} }
async function handleConfigBanner(i) { const url=i.fields.getTextInputValue('banner_url').trim(); if(!url) return safeReply(i,'URL obrigatória.'); await i.deferReply({ephemeral:true}); try{const buf=await downloadImage(url); await i.client.user.setBanner(buf); await i.followUp({content:'✅ Banner do bot atualizado!',ephemeral:true});} catch(e){await i.followUp({content:`❌ Erro: ${e.message}`,ephemeral:true});} }
