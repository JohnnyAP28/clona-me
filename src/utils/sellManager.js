const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'panels.json');
const panels = new Map();
let nextId = 1;

function saveToFile() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const data = { nextId, panels: [...panels.entries()].map(([id, p]) => [id, serializePanel(p)]) };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error('[SELL] Save:', e.message); }
}
function loadFromFile() {
  try { if (!fs.existsSync(DATA_FILE)) return; const d = JSON.parse(fs.readFileSync(DATA_FILE,'utf-8')); nextId = d.nextId||1; for (const [id,p] of d.panels) panels.set(parseInt(id), deserializePanel(p)); console.log(`[SELL] ${panels.size} painéis carregados.`); } catch(e) { console.error('[SELL] Load:', e.message); }
}
function serializePanel(p) { return { id:p.id, guildId:p.guildId, ownerId:p.ownerId, channelId:p.channelId, title:p.title, description:p.description, price:p.price, externalPrice:p.externalPrice, deliveryType:p.deliveryType, iconUrl:p.iconUrl, bannerUrl:p.bannerUrl, showStock:p.showStock, showSold:p.showSold, lockStock:p.lockStock, color:p.color, showThumbnail:p.showThumbnail, stock:p.stock, soldCount:p.soldCount, messageId:p.messageId, published:p.published, createdAt:p.createdAt?p.createdAt.toISOString():new Date().toISOString(), options:p.options?p.options.map(o=>({...o})):[] }; }
function deserializePanel(r) { return { ...r, createdAt: new Date(r.createdAt||Date.now()), stock:(r.stock||[]).map(s=>typeof s==='string'?{content:s,used:false}:s), options:(r.options||[]).map(o=>({label:o.label,description:o.description,price:o.price,deliveryContent:o.deliveryContent||''})) }; }
loadFromFile();

function createPanel(guildId, ownerId, channelId) {
  const id = nextId++;
  const panel = { id, guildId, ownerId, channelId, title:'', description:'', price:'', externalPrice:'', deliveryType:'manual', iconUrl:'', bannerUrl:'', showStock:true, showSold:false, lockStock:false, color:'#8A2BE2', showThumbnail:true, stock:[], soldCount:0, messageId:null, published:false, createdAt:new Date(), options:[] };
  panels.set(id, panel); saveToFile(); return panel;
}
function getPanel(id) { return panels.get(id)||null; }
function listPanels(guildId) { return [...panels.values()].filter(p=>p.guildId===guildId); }
function deletePanel(id) { const r=panels.delete(id); if(r) saveToFile(); return r; }

function addOption(panelId, {label, description, price, deliveryContent=''}) {
  const p = getPanel(panelId); if (!p) return null;
  p.options.push({label:label.trim(), description:description.trim(), price:price.trim(), deliveryContent:deliveryContent.trim()});
  saveToFile(); return p.options[p.options.length-1];
}
function removeOption(panelId, index) {
  const p = getPanel(panelId); if (!p||index<0||index>=p.options.length) return false;
  p.options.splice(index,1); saveToFile(); return true;
}

function buildPanelEmbed(panel) {
  const colorDec = parseInt(resolveColor(panel.color).replace('#',''),16);
  const embed = new EmbedBuilder().setTitle(panel.title||'Painel de Venda').setColor(colorDec);
  if (panel.description) embed.setDescription(panel.description);

  // Se tem opções (planos), mostra select menu style no embed
  if (panel.options.length > 0) {
    let optsText = '';
    for (const o of panel.options) {
      optsText += `**${o.label}** — ${o.price}\n${o.description}\n\n`;
    }
    embed.addFields({name:'📋 Planos Disponíveis',value:optsText.slice(0,1024)});
  } else if (panel.price) {
    let pt = panel.price;
    if (panel.externalPrice) pt += ` ~~(R$ ${panel.externalPrice})~~`;
    embed.addFields({name:'💰 Valor',value:pt,inline:true});
  }

  embed.addFields({name:'📦 Entrega',value:panel.deliveryType==='auto'?'⚡ Automática':'👤 Manual',inline:true});
  if (panel.showStock) {
    const av = panel.lockStock?panel.stock.length:panel.stock.filter(s=>!s.used).length;
    embed.addFields({name:'📊 Estoque',value:panel.lockStock?`🔒 Ilimitado (${panel.stock.length} itens)`:panel.stock.length?`${av}/${panel.stock.length} disponíveis`:'Sem estoque',inline:true});
  }
  if (panel.showSold) embed.addFields({name:'🛒 Vendidos',value:`${panel.soldCount}`,inline:true});
  if (panel.showThumbnail && panel.iconUrl) embed.setThumbnail(panel.iconUrl);
  if (panel.bannerUrl) embed.setImage(panel.bannerUrl);
  embed.setFooter({text:'Clona-Me • Clique no botão abaixo para comprar'}).setTimestamp();
  return embed;
}

function buildPurchaseButton(panelId, panel) {
  const hasStock = panel.lockStock || panel.stock.some(s=>!s.used) || panel.stock.length===0;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`buy_${panelId}`).setLabel('🛍️ Comprar').setStyle(ButtonStyle.Success).setDisabled(!hasStock && panel.stock.length>0)
  );
}

function buildOptionSelect(panelId, panel) {
  if (!panel.options.length) return null;
  const opts = panel.options.map((o,i)=>new StringSelectMenuOptionBuilder().setLabel(o.label.slice(0,100)).setValue(`opt_${i}`).setDescription(`${o.price} — ${o.description}`.slice(0,100)));
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`optselect_${panelId}`).setPlaceholder('Escolha um plano').addOptions(opts));
}

function addStock(panelId, items) { const panel=getPanel(panelId); if(!panel) return false; for(const item of items) panel.stock.push({content:item,used:false}); saveToFile(); return true; }
function consumeStock(panelId) { const panel=getPanel(panelId); if(!panel) return null; if(panel.lockStock){const i=panel.stock[0]; if(!i) return null; panel.soldCount++; saveToFile(); return i.content;} const i=panel.stock.find(s=>!s.used); if(!i) return null; i.used=true; panel.soldCount++; saveToFile(); return i.content; }

module.exports = { COLOR_NAMES, resolveColor, createPanel, getPanel, listPanels, deletePanel, buildPanelEmbed, buildPurchaseButton, buildOptionSelect, addStock, consumeStock, addOption, removeOption };
