const { EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } = require('discord.js');
const { getPanel, buildPanelEmbed, buildPurchaseButton, buildOptionSelect, addStock, consumeStock, resolveColor, listPanels, deletePanel, addOption } = require('../utils/sellManager');
const { createTicket, getTicketByChannel, closeTicket, getUserOpenTickets, createCoupon, validateCoupon, useCoupon, joinRaffle, listActiveRaffles } = require('../utils/extrasManager');
const sell = require('../commands/sell');
const { showEditMenu } = require('../commands/edit');
const fs = require('node:fs');
const path = require('node:path');
const DATA_DIR = path.join(__dirname,'..','..','data');

// Cooldown
const cooldowns = new Map();
const COOLDOWN_MS = 3000;
function isOnCooldown(userId) {
  const last = cooldowns.get(userId);
  if (last && Date.now() - last < COOLDOWN_MS) return true;
  cooldowns.set(userId, Date.now());
  return false;
}

// Webhook error reporting
async function reportError(bot, msg, stack) {
  try {
    const config = require('../config');
    const url = config.webhookUrl;
    if (!url) return;
    const body = JSON.stringify({content:`**${msg}**\n\`\`\`${(stack||msg).slice(0,1500)}\`\`\``});
    const mod = url.startsWith('https') ? require('node:https') : require('node:http');
    const req = mod.request(url.replace('https://','').replace('http://','').split('/')[2] ? { hostname: url.split('/')[2], path: '/'+url.split('/').slice(3).join('/'), method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}} : new URL(url), res => {});
    require(url.startsWith('https')?'node:https':'node:http').request(new URL(url), {method:'POST',headers:{'Content-Type':'application/json'}}, res=>{}).end(body);
  } catch(_) {}
}

// Purchase log
function logPurchase(panel, buyerId, staffId, price) {
  try {
    if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
    const fp = path.join(DATA_DIR,'purchases.json');
    let log = []; try{if(fs.existsSync(fp)) log = JSON.parse(fs.readFileSync(fp,'utf-8'));} catch(_){}
    log.push({productName:panel.title,price,buyerId,staffId,panelId:panel.id,date:new Date().toISOString()});
    fs.writeFileSync(fp,JSON.stringify(log,null,2));
  } catch(_) {}
}

function downloadImage(url) {
  if (typeof fetch !== 'undefined') return fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); }).then(b => Buffer.from(b));
  const mod = url.startsWith('https') ? require('node:https') : require('node:http');
  return new Promise((resolve, reject) => { mod.get(url, (res) => { if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`)); const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks))); }).on('error', reject); });
}

async function refreshConfig(i, panel) { const embed=buildPanelEmbed(panel); embed.setTitle('🔧 Configurar — Preview'); embed.setDescription((panel.description||'')+'\n\n⚠️ Salvo automaticamente.'); await i.update({embeds:[embed],components:sell.buildConfigRows(panel)}); }
async function refreshEdit(i, panel) {
  const embed=buildPanelEmbed(panel); embed.setTitle(`✏️ Editando #${panel.id}`); embed.setDescription((panel.description||'')+'\n\n⚠️ Salvo.');
  const b = (id,label,style) => new ButtonBuilder().setCustomId(`${id}_${panel.id}`).setLabel(label).setStyle(style);
  await i.update({embeds:[embed],components:[
    new ActionRowBuilder().addComponents(b('editcfg_title','📝 Título',ButtonStyle.Primary),b('editcfg_desc','📄 Descrição',ButtonStyle.Primary),b('editcfg_price','💰 Valor',ButtonStyle.Primary),b('editcfg_color','🎨 Cor',ButtonStyle.Primary)),
    new ActionRowBuilder().addComponents(b('editcfg_stock','📦 Estoque',ButtonStyle.Secondary),b('editcfg_items','🔄 Substituir',ButtonStyle.Secondary),b('editcfg_options','📋 Planos',ButtonStyle.Secondary),b('editcfg_deliv','📨 Entrega',ButtonStyle.Secondary)),
    new ActionRowBuilder().addComponents(b('editcfg_icon','🖼️ Ícone',ButtonStyle.Secondary),b('editcfg_banner','🎨 Banner',ButtonStyle.Secondary),b('editcfg_display','👁️ Exibição',ButtonStyle.Secondary),b('editcfg_thumb',`📌 Thumb: ${panel.showThumbnail?'ON':'OFF'}`,ButtonStyle.Secondary)),
    new ActionRowBuilder().addComponents(b('editcfg_delete','🗑️ Deletar',ButtonStyle.Danger),b('editcfg_update','🔄 Atualizar',ButtonStyle.Success)),
  ]});
}

// ═══ MAIN ═══
module.exports = {
  name:'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      if (isOnCooldown(interaction.user.id)) return interaction.reply({content:'⏳ Aguarde 3s entre comandos.',ephemeral:true});
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) return;
      try { await cmd.execute(interaction); }
      catch (e) { console.error(`[ERRO] ${interaction.commandName}:`,e.message); reportError(interaction.client,`Comando /${interaction.commandName}: ${e.message}`,e.stack); await safeReply(interaction,`❌ Erro: ${e.message.slice(0,1500)}`); }
      return;
    }
    if (interaction.isModalSubmit()) { const cid=interaction.customId;
      if(cid==='clone_modal') return handleCmdModal(interaction,'clone'); if(cid==='clean_modal') return handleCmdModal(interaction,'resetar');
      if(cid.startsWith('sell_modal_')) return handleCmdModal(interaction,'venda');
      if(cid.startsWith('sell_stock_')) return handleStock(interaction,cid); if(cid.startsWith('sell_delivery_')) return handleDelivery(interaction,cid);
      if(cid.startsWith('sell_icon_')) return handleIcon(interaction,cid); if(cid.startsWith('sell_banner_')) return handleBanner(interaction,cid);
      if(cid.startsWith('sell_display_')) return handleDisplay(interaction,cid); if(cid.startsWith('sell_options_add_')) return handleOptionsAdd(interaction,cid);
      if(cid.startsWith('edit_items_')) return handleReplaceStock(interaction,cid);
      if(cid.startsWith('edit_title_')) return handleEditTitle(interaction,cid); if(cid.startsWith('edit_desc_')) return handleEditDesc(interaction,cid);
      if(cid.startsWith('edit_price_')) return handleEditPrice(interaction,cid); if(cid.startsWith('edit_color_')) return handleEditColor(interaction,cid);
      if(cid.startsWith('edit_options_add_')) return handleOptionsAdd(interaction,cid);
      if(cid==='config_pix_main') return handleConfigPix(interaction); if(cid==='config_desc_main') return handleConfigDesc(interaction);
      if(cid==='config_avatar_main') return handleConfigAvatar(interaction); if(cid==='config_banner_main') return handleConfigBanner(interaction);
      if(cid==='config_logchannel_main') return handleConfigLogChannel(interaction); if(cid==='config_customerrole_main') return handleConfigCustomerRole(interaction);
      if(cid==='config_webhook_main') return handleConfigWebhook(interaction);
    }
    if (interaction.isButton()) { const cid=interaction.customId;
      if(cid.startsWith('sellcfg_')) return handleSellCfg(interaction,cid);
      if(cid.startsWith('buy_')) return handlePurchaseStart(interaction,cid);
      if(cid.startsWith('payconfirm_')) return handlePayConfirm(interaction,cid); if(cid.startsWith('paycancel_')) return handlePayCancel(interaction,cid);
      if(cid.startsWith('paycopy_')) return handlePayCopy(interaction,cid);
      if(cid.startsWith('staffverify_')) return handleStaffVerify(interaction,cid); if(cid.startsWith('staffdeliver_')) return handleStaffVerify(interaction,cid);
      if(cid.startsWith('staffreject_')) return handleStaffReject(interaction,cid);
      if(cid.startsWith('editcfg_')) return handleEditCfg(interaction,cid); if(cid.startsWith('editcfg_update_')) return handleEditUpdate(interaction,cid);
      if(cid.startsWith('config_')) return handleConfigBtn(interaction,cid);
      if(cid.startsWith('ticket_close_')) return handleTicketClose(interaction,cid);
      if(cid.startsWith('raffle_join_')) return handleRaffleJoin(interaction,cid);
    }
    if (interaction.isStringSelectMenu()) { const cid=interaction.customId;
      if(cid.startsWith('sell_thumb_')) return handleThumbToggle(interaction,cid);
      if(cid==='edit_select_panel') return handleEditSelect(interaction); if(cid==='edit_delete_multi') return handleDeleteMulti(interaction);
      if(cid.startsWith('optselect_')) return handleOptionSelect(interaction,cid);
    }
  },
};

async function safeReply(i,m){try{if(i.replied||i.deferred)await i.followUp({content:m,ephemeral:true});else await i.reply({content:m,ephemeral:true});}catch(_){}}
function pid(cid){return parseInt(cid.split('_').pop());}
async function handleCmdModal(i,name){const cmd=i.client.commands.get(name);if(!cmd?.handleModal)return safeReply(i,'Erro interno.');try{await cmd.handleModal(i);}catch(e){reportError(i.client,`Modal /${name}: ${e.message}`,e.stack);await safeReply(i,`Erro: ${e.message.slice(0,200)}`);}}

// ═══ SELL ═══
async function handleStock(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.lockStock=i.fields.getTextInputValue('stock_lock').trim().toLowerCase().startsWith('s');const raw=i.fields.getTextInputValue('stock_items').trim();const items=raw.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s!=='--').join(' -- ').split('--').map(s=>s.trim()).filter(Boolean);if(items.length)addStock(p.id,items);await refreshConfig(i,p);}
async function handleDelivery(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.deliveryType=i.fields.getTextInputValue('delivery_type').trim().toLowerCase()==='auto'?'auto':'manual';await refreshConfig(i,p);}
async function handleIcon(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.iconUrl=i.fields.getTextInputValue('icon_url').trim();await refreshConfig(i,p);}
async function handleBanner(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.bannerUrl=i.fields.getTextInputValue('banner_url').trim();await refreshConfig(i,p);}
async function handleDisplay(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.showStock=i.fields.getTextInputValue('show_stock').trim().toLowerCase().startsWith('s');p.showSold=i.fields.getTextInputValue('show_sold').trim().toLowerCase().startsWith('s');await refreshConfig(i,p);}
async function handleThumbToggle(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.showThumbnail=i.values[0]!=='none';await refreshConfig(i,p);}
async function handleOptionsAdd(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');const label=i.fields.getTextInputValue('opt_label').trim();const price=i.fields.getTextInputValue('opt_price').trim();const desc=i.fields.getTextInputValue('opt_desc')?.trim()||'';const dc=i.fields.getTextInputValue('opt_delivery')?.trim()||'';if(label&&price){addOption(p.id,{label,description:desc,price,deliveryContent:dc});await refreshConfig(i,p);}else await safeReply(i,'Preencha nome e valor.');}
async function handleSellCfg(i,cid){const pid2=pid(cid);const p=getPanel(pid2);if(!p)return safeReply(i,'Expirado.');const act=cid.replace(/sellcfg_/,'').replace(/_\d+$/,'');if(act==='stock')return i.showModal(sell.buildStockModal(pid2));if(act==='deliv')return i.showModal(sell.buildDeliveryModal(pid2,p.deliveryType));if(act==='icon')return i.showModal(sell.buildIconModal(pid2,p.iconUrl));if(act==='banner')return i.showModal(sell.buildBannerModal(pid2,p.bannerUrl));if(act==='display')return i.showModal(sell.buildDisplayModal(pid2,p));if(act==='options')return i.showModal(sell.buildOptionsModal(pid2));if(act==='thumb')return i.reply({content:'Escolha:',components:[new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`sell_thumb_${pid2}`).setPlaceholder('Thumbnail').addOptions(new StringSelectMenuOptionBuilder().setLabel('ON').setValue('top').setDefault(p.showThumbnail),new StringSelectMenuOptionBuilder().setLabel('OFF').setValue('none').setDefault(!p.showThumbnail)))],ephemeral:true});if(act==='preview'){const e=buildPanelEmbed(p);e.setTitle(`🔍 Preview — ${p.title}`);return i.reply({embeds:[e],ephemeral:true});}if(act==='pub'){if(!p.title)return safeReply(i,'Preencha título.');await i.deferReply({ephemeral:true});try{const ch=i.client.channels.cache.get(p.channelId);if(!ch)return i.followUp({content:'❌ Canal não encontrado.',ephemeral:true});const emb=buildPanelEmbed(p);const comps=[buildPurchaseButton(p.id,p)];const optSel=buildOptionSelect(p.id,p);if(optSel)comps.unshift(optSel);const msg=await ch.send({embeds:[emb],components:comps});p.messageId=msg.id;p.published=true;await i.followUp({content:`✅ Painel #${p.id} publicado em ${ch}.`,ephemeral:true});}catch(e){await i.followUp({content:`❌ ${e.message}`,ephemeral:true});}}}

// ═══ CARRINHO ═══
const activeCarts=new Map();
async function createCartChannel(guild,buyer,panel){try{let cat=guild.channels.cache.find(c=>c.type===4&&c.name==='🛒・Carrinhos');if(!cat)cat=await guild.channels.create({name:'🛒・Carrinhos',type:4,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels]}]});return await guild.channels.create({name:`🛒・carrinho-${buyer.username}`.slice(0,32),type:0,parent:cat.id,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:buyer.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:guild.members.me.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ReadMessageHistory]}]});}catch(e){return null;}}
async function closeCartChannel(guild,channelId){try{const ch=guild.channels.cache.get(channelId);if(!ch)return;await ch.send({embeds:[new EmbedBuilder().setTitle('🛒 Carrinho Finalizado').setColor(0xF0B232).setDescription('⏳ Fechando em 5s...').setFooter({text:'PRIMO Store'})]});await ch.permissionOverwrites.edit(guild.roles.everyone.id,{ViewChannel:false});setTimeout(async()=>{try{await ch.delete();}catch(_){}},5000);}catch(e){}}

async function handleOptionSelect(i,cid){const panelId=pid(cid);const p=getPanel(panelId);if(!p)return safeReply(i,'Expirado.');const optIdx=parseInt(i.values[0].replace('opt_',''));const opt=p.options[optIdx];if(!opt)return safeReply(i,'Opção inválida.');await startCart(i,p,opt.label,opt.price);}
async function handlePurchaseStart(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Indisponível.');if(!p.published)return safeReply(i,'Não disponível.');if(!p.lockStock&&!p.stock.some(s=>!s.used))return safeReply(i,'❌ Estoque esgotado.');if(p.options.length>0){const sel=buildOptionSelect(p.id,p);if(!sel)return safeReply(i,'Erro.');const emb=new EmbedBuilder().setTitle('📋 Planos — '+p.title).setColor(0x5865F2).setDescription('Escolha um plano:');return i.reply({embeds:[emb],components:[sel],ephemeral:true});}
  await startCart(i,p,p.title,p.price);
}

async function startCart(i,p,title,price) {
  const config=require('../config');const pixKey=config.pixKey||'(não configurado)';
  await i.deferReply({ephemeral:true});
  const cc=await createCartChannel(i.guild,i.user,p);if(!cc)return i.followUp({content:'❌ Erro ao criar carrinho.',ephemeral:true});
  activeCarts.set(p.id,{buyerId:i.user.id,channelId:cc.id,price:price});
  const emb=new EmbedBuilder().setTitle('🛒 Carrinho').setColor(0x5865F2).setDescription(`${i.user}, continue sua compra!\n\n**Produto:** ${title}\n**Valor:** ${price}\n**Entrega:** ${p.deliveryType==='auto'?'⚡ Automática':'👤 Manual'}\n\n**Chave PIX:**\n\`\`\`${pixKey}\`\`\``).setFooter({text:'Após pagar, clique em "Já paguei"'});
  if(config.pixQrUrl)emb.setImage(config.pixQrUrl);
  try{await cc.send({embeds:[emb],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`paycopy_${p.id}`).setLabel('📋 Copiar PIX').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId(`payconfirm_${p.id}`).setLabel('✅ Já paguei').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`paycancel_${p.id}`).setLabel('❌ Cancelar').setStyle(ButtonStyle.Danger))]});}catch(_){}
  await i.followUp({content:`🛒 Carrinho criado! Continue no canal: ${cc}`,ephemeral:true});
}
async function handlePayCopy(i,cid){const config=require('../config');await i.reply({content:config.pixKey||'PIX não configurado',ephemeral:true});}
async function handlePayConfirm(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');await i.deferReply({ephemeral:true});const buyerId=i.user.id;const cart=activeCarts.get(p.id);const notifyCh=cart?.channelId?i.guild.channels.cache.get(cart.channelId):null;if(notifyCh){try{await notifyCh.send({embeds:[new EmbedBuilder().setTitle('🔔 Pagamento Pendente').setColor(0xF0B232).setDescription(`**Produto:** ${p.title}\n**Comprador:** <@${buyerId}>\n\n⚠️ Verifique antes de confirmar.`).setFooter({text:`Painel #${p.id}`}).setTimestamp()],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`staffverify_${p.id}_${buyerId}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`staffreject_${p.id}_${buyerId}`).setLabel('❌ Rejeitar').setStyle(ButtonStyle.Danger))]});}catch(_){}} await i.followUp({content:'✅ Pagamento registrado! Staff verificará em instantes.',ephemeral:true});}
async function handleStaffVerify(i,cid){if(!i.memberPermissions?.has('Administrator'))return safeReply(i,'Apenas staff.');const ps=cid.split('_');const panelId=parseInt(ps[1]);const buyerId=ps[2];const p=getPanel(panelId);if(!p)return safeReply(i,'Expirado.');await i.deferUpdate();const item=consumeStock(p.id);if(!item){await i.editReply({content:'❌ Estoque esgotado.',embeds:[],components:[]});return;}logPurchase(p,buyerId,i.user.id,p.price);if(p.published&&p.messageId){try{const ch=i.client.channels.cache.get(p.channelId);const msg=await ch?.messages.fetch(p.messageId).catch(()=>null);if(msg){const comps=[buildPurchaseButton(p.id,p)];const os=buildOptionSelect(p.id,p);if(os)comps.unshift(os);await msg.edit({embeds:[buildPanelEmbed(p)],components:comps});}}catch(_){}}try{const config=require('../config');if(config.customerRoleId){const m=await i.guild.members.fetch(buyerId).catch(()=>null);if(m){await m.roles.add(config.customerRoleId).catch(()=>{});}}}catch(_){}try{const config=require('../config');if(config.logChannelId){const lc=i.guild.channels.cache.get(config.logChannelId);if(lc){await lc.send({embeds:[new EmbedBuilder().setTitle('📋 Venda').setColor(0x57f287).setDescription(`**${p.title}**\nComprador: <@${buyerId}>\nValor: R$ ${p.price}\nPainel: #${p.id}`).setTimestamp()]});}}}catch(_){}const dmLink='https://discord.com/channels/@me';try{const buyer=await i.client.users.fetch(buyerId).catch(()=>null);if(buyer){await buyer.send({embeds:[new EmbedBuilder().setTitle('🎁 Produto Entregue!').setColor(0x57f287).setDescription(`**${p.title}**\n\nPagamento confirmado!`).addFields({name:'📦 Conteúdo',value:item.slice(0,1024)}).setFooter({text:'PRIMO Store'}).setTimestamp()]}).catch(()=>{});}}catch(_){}const cart=activeCarts.get(p.id);if(cart){await closeCartChannel(i.guild,cart.channelId);activeCarts.delete(p.id);}await i.editReply({content:null,embeds:[new EmbedBuilder().setTitle('🎉 Parabéns pela compra! 🎉').setColor(0x57f287).setDescription(`<@${buyerId}>, produto entregue!\n\n📬 [Abrir DM](${dmLink})\n🛒 Carrinho fechando em 5s...`).setFooter({text:`Painel #${p.id} • ${i.user.username}`}).setTimestamp()],components:[]});}
async function handleStaffReject(i,cid){if(!i.memberPermissions?.has('Administrator'))return safeReply(i,'Apenas staff.');const ps=cid.split('_');const panelId=parseInt(ps[1]);const buyerId=ps[2];const cart=activeCarts.get(panelId);if(cart){await closeCartChannel(i.guild,cart.channelId);activeCarts.delete(panelId);}await i.update({content:`❌ Pagamento #${panelId} de <@${buyerId}> rejeitado.`,embeds:[],components:[]});}
async function handlePayCancel(i,cid){const panelId=pid(cid);const cart=activeCarts.get(panelId);if(cart){await closeCartChannel(i.guild,cart.channelId);activeCarts.delete(panelId);}await i.update({content:'❌ Compra cancelada.',embeds:[],components:[]});}

// ═══ EDIT ═══
async function handleReplaceStock(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');const raw=i.fields.getTextInputValue('replace_items').trim();if(raw){p.stock=[];const items=raw.split(/[\n\r]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s!=='--').join(' -- ').split('--').map(s=>s.trim()).filter(Boolean);addStock(p.id,items);}await refreshEdit(i,p);}
async function handleEditTitle(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.title=i.fields.getTextInputValue('new_title').trim();await refreshEdit(i,p);}
async function handleEditDesc(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.description=i.fields.getTextInputValue('new_desc').trim();await refreshEdit(i,p);}
async function handleEditPrice(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.price=i.fields.getTextInputValue('new_price').trim();await refreshEdit(i,p);}
async function handleEditColor(i,cid){const p=getPanel(pid(cid));if(!p)return safeReply(i,'Expirado.');p.color=resolveColor(i.fields.getTextInputValue('new_color').trim());await refreshEdit(i,p);}
async function handleEditCfg(i,cid){const pid2=pid(cid),p=getPanel(pid2);if(!p)return safeReply(i,'Expirado.');if(cid.startsWith('editcfg_stock_'))return i.showModal(sell.buildStockModal(pid2));if(cid.startsWith('editcfg_deliv_'))return i.showModal(sell.buildDeliveryModal(pid2,p.deliveryType));if(cid.startsWith('editcfg_icon_'))return i.showModal(sell.buildIconModal(pid2,p.iconUrl));if(cid.startsWith('editcfg_banner_'))return i.showModal(sell.buildBannerModal(pid2,p.bannerUrl));if(cid.startsWith('editcfg_display_'))return i.showModal(sell.buildDisplayModal(pid2,p));if(cid.startsWith('editcfg_options_'))return i.showModal(sell.buildOptionsModal(pid2));if(cid.startsWith('editcfg_thumb_')){p.showThumbnail=!p.showThumbnail;return i.reply({content:`✅ Thumb: ${p.showThumbnail?'ON':'OFF'}`,ephemeral:true});}if(cid.startsWith('editcfg_items_'))return i.showModal(new ModalBuilder().setCustomId(`edit_items_${pid2}`).setTitle('Substituir Estoque').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('replace_items').setLabel('Novos itens (-- separados)').setPlaceholder('item1\n--\nitem2').setStyle(2).setRequired(false).setMaxLength(2000))));if(cid.startsWith('editcfg_title_'))return i.showModal(new ModalBuilder().setCustomId(`edit_title_${pid2}`).setTitle('Editar Título').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_title').setLabel('Novo título').setStyle(1).setRequired(true).setMaxLength(256).setValue(p.title))));if(cid.startsWith('editcfg_desc_'))return i.showModal(new ModalBuilder().setCustomId(`edit_desc_${pid2}`).setTitle('Editar Descrição').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_desc').setLabel('Nova descrição').setStyle(2).setRequired(true).setMaxLength(2000).setValue(p.description))));if(cid.startsWith('editcfg_price_'))return i.showModal(new ModalBuilder().setCustomId(`edit_price_${pid2}`).setTitle('Editar Valor').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_price').setLabel('Novo valor').setStyle(1).setRequired(true).setMaxLength(60).setValue(p.price))));if(cid.startsWith('editcfg_color_'))return i.showModal(new ModalBuilder().setCustomId(`edit_color_${pid2}`).setTitle('Editar Cor').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_color').setLabel('Cor (HEX ou nome)').setStyle(1).setRequired(false).setMaxLength(32).setValue(p.color))));if(cid.startsWith('editcfg_delete_')){deletePanel(pid2);return i.reply({content:`🗑️ Painel #${pid2} deletado.`,ephemeral:true});}}
async function handleEditUpdate(i,cid){const pid2=pid(cid),p=getPanel(pid2);if(!p)return safeReply(i,'Não encontrado.');if(!p.published)return safeReply(i,'⚠️ Não publicado.');if(!p.messageId)return safeReply(i,'⚠️ ID perdido.');await i.deferReply({ephemeral:true});try{const ch=i.client.channels.cache.get(p.channelId);if(!ch)return i.followUp({content:'❌ Canal não encontrado.',ephemeral:true});const msg=await ch.messages.fetch(p.messageId).catch(()=>null);if(!msg){p.messageId=null;p.published=false;return i.followUp({content:'❌ Mensagem perdida.',ephemeral:true});}const comps=[buildPurchaseButton(p.id,p)];const os=buildOptionSelect(p.id,p);if(os)comps.unshift(os);await msg.edit({embeds:[buildPanelEmbed(p)],components:comps});await i.followUp({content:`✅ Painel #${p.id} atualizado!`,ephemeral:true});}catch(e){await i.followUp({content:`❌ ${e.message}`,ephemeral:true});}}
async function handleEditSelect(i){const val=i.values[0];if(!val.startsWith('panel_'))return safeReply(i,'Inválido.');const panelId=parseInt(val.replace('panel_',''));const p=getPanel(panelId);if(!p)return safeReply(i,'Não encontrado.');await showEditMenu(i,p);}
async function handleDeleteMulti(i){const ids=i.values.filter(v=>v.startsWith('delete_')).map(v=>parseInt(v.replace('delete_','')));if(!ids.length)return safeReply(i,'Nenhum.');let d=0;for(const id of ids){if(deletePanel(id))d++;}await i.reply({content:`🗑️ ${d} painel(is) deletado(s).`,ephemeral:true});}

// ═══ TICKET / RAFFLE ═══
async function handleTicketClose(i,cid){const ticket=closeTicket(parseInt(cid.replace('ticket_close_','')));if(!ticket)return safeReply(i,'Ticket não encontrado.');await i.reply({content:'🔒 Ticket fechado. Canal deletado em 5s...'});setTimeout(async()=>{try{await i.channel.delete();}catch(_){}},5000);}
async function handleRaffleJoin(i,cid){const raffleId=parseInt(cid.replace('raffle_join_',''));const result=joinRaffle(raffleId,i.user.id);if(!result.ok)return i.reply({content:result.reason,ephemeral:true});await i.reply({content:`🎟️ Participando! (${result.count} participante(s))`,ephemeral:true});}

// ═══ /config ═══
async function handleConfigBtn(i,cid){const act=cid.replace('config_','');const config=require('../config');const pk=config.pixKey?`\`${config.pixKey.slice(0,30)}...\``:'❌';const cbase=[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('config_pix').setLabel('💳 PIX').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('config_avatar').setLabel('🖼️ Avatar').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_banner').setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_desc').setLabel('📝 Descrição').setStyle(ButtonStyle.Secondary)),new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('config_logchannel').setLabel('📋 Log').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_customerrole').setLabel('👤 Cargo').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_webhook').setLabel('🔗 Webhook').setStyle(ButtonStyle.Secondary))];
  if(act==='pix')return i.showModal(new ModalBuilder().setCustomId('config_pix_main').setTitle('PIX').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pix_key').setLabel('Chave PIX').setPlaceholder('CPF/email/telefone').setStyle(1).setRequired(true).setMaxLength(100).setValue(config.pixKey||'')),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pix_qr').setLabel('URL QR Code (opcional)').setPlaceholder('https://').setStyle(1).setRequired(false).setMaxLength(400).setValue(config.pixQrUrl||''))));
  if(act==='desc')return i.showModal(new ModalBuilder().setCustomId('config_desc_main').setTitle('Descrição').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bot_desc').setLabel('Descrição do perfil').setPlaceholder('O melhor bot de marketplace').setStyle(2).setRequired(false).setMaxLength(400))));
  if(act==='avatar')return i.showModal(new ModalBuilder().setCustomId('config_avatar_main').setTitle('Avatar').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('avatar_url').setLabel('URL da imagem').setPlaceholder('https://').setStyle(1).setRequired(true).setMaxLength(400))));
  if(act==='banner')return i.showModal(new ModalBuilder().setCustomId('config_banner_main').setTitle('Banner').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner_url').setLabel('URL da imagem').setPlaceholder('https://').setStyle(1).setRequired(true).setMaxLength(400))));
  if(act==='logchannel')return i.showModal(new ModalBuilder().setCustomId('config_logchannel_main').setTitle('Log de Vendas').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('log_channel_id').setLabel('ID do canal').setPlaceholder('1234567890').setStyle(1).setRequired(false).setValue(config.logChannelId||'').setMaxLength(20))));
  if(act==='customerrole')return i.showModal(new ModalBuilder().setCustomId('config_customerrole_main').setTitle('Cargo Cliente').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('customer_role_id').setLabel('ID do cargo').setPlaceholder('1234567890').setStyle(1).setRequired(false).setValue(config.customerRoleId||'').setMaxLength(20))));
  if(act==='webhook')return i.showModal(new ModalBuilder().setCustomId('config_webhook_main').setTitle('Webhook de Erros').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('webhook_url').setLabel('URL do Webhook').setPlaceholder('https://discord.com/api/webhooks/...').setStyle(1).setRequired(false).setValue(config.webhookUrl||'').setMaxLength(200))));
}
async function handleConfigPix(i){const key=i.fields.getTextInputValue('pix_key').trim();const qr=i.fields.getTextInputValue('pix_qr')?.trim()||'';const config=require('../config');config.pixKey=key;config.pixQrUrl=qr;await i.update({embeds:[new EmbedBuilder().setTitle('⚙️ Config').setColor(0x5865F2).setDescription(`PIX: ${key?`\`${key.slice(0,30)}...\``:'❌'}\nQR: ${qr?'✅':'❌'}\n✅ Salvo!`)],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('config_pix').setLabel('💳 PIX').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('config_avatar').setLabel('🖼️ Avatar').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_banner').setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('config_desc').setLabel('📝 Descrição').setStyle(ButtonStyle.Secondary))]});}
async function handleConfigLogChannel(i){const id=i.fields.getTextInputValue('log_channel_id').trim();const config=require('../config');config.logChannelId=id;await i.update({embeds:[new EmbedBuilder().setTitle('⚙️ Config').setColor(0x5865F2).setDescription(`Logs: ${id?`<#${id}>`:'❌'}\n✅ Salvo!`)],components:null});}
async function handleConfigCustomerRole(i){const id=i.fields.getTextInputValue('customer_role_id').trim();const config=require('../config');config.customerRoleId=id;await i.update({embeds:[new EmbedBuilder().setTitle('⚙️ Config').setColor(0x5865F2).setDescription(`Cargo: ${id?`<@&${id}>`:'❌'}\n✅ Salvo!`)],components:null});}
async function handleConfigWebhook(i){const url=i.fields.getTextInputValue('webhook_url').trim();const config=require('../config');config.webhookUrl=url;await i.update({embeds:[new EmbedBuilder().setTitle('⚙️ Config').setColor(0x5865F2).setDescription(`Webhook: ${url?'✅ Configurado':'❌ Desativado'}\n✅ Salvo!`)],components:null});}
async function handleConfigDesc(i){const desc=i.fields.getTextInputValue('bot_desc')?.trim()||'Clona-Me • discord.gg/hykfavEur';try{await i.client.user.setPresence({activities:[{name:desc,type:4}]});}catch(e){}await i.reply({content:'✅ Descrição atualizada.',ephemeral:true});}
async function handleConfigAvatar(i){const url=i.fields.getTextInputValue('avatar_url').trim();if(!url)return safeReply(i,'URL obrigatória.');await i.deferReply({ephemeral:true});try{const buf=await downloadImage(url);await i.client.user.setAvatar(buf);await i.followUp({content:'✅ Avatar atualizado!',ephemeral:true});}catch(e){await i.followUp({content:`❌ ${e.message}`,ephemeral:true});}}
async function handleConfigBanner(i){const url=i.fields.getTextInputValue('banner_url').trim();if(!url)return safeReply(i,'URL obrigatória.');await i.deferReply({ephemeral:true});try{const buf=await downloadImage(url);await i.client.user.setBanner(buf);await i.followUp({content:'✅ Banner atualizado!',ephemeral:true});}catch(e){await i.followUp({content:`❌ ${e.message}`,ephemeral:true});}}
