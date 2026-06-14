const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const COLOR_NAMES = {
  'vermelho':'#FF0000','red':'#FF0000','verde':'#57F287','green':'#57F287',
  'azul':'#5865F2','blue':'#5865F2','amarelo':'#FEE75C','yellow':'#FEE75C',
  'roxo':'#8A2BE2','purple':'#8A2BE2','violeta':'#8A2BE2',
  'rosa':'#EB459E','pink':'#EB459E','laranja':'#F47B20','orange':'#F47B20',
  'ciano':'#00FFFF','cyan':'#00FFFF','preto':'#000000','black':'#000000',
  'branco':'#FFFFFF','white':'#FFFFFF','cinza':'#808080','gray':'#808080','grey':'#808080',
  'dourado':'#FFD700','gold':'#FFD700','turquesa':'#1ABC9C','teal':'#1ABC9C',
};
function resolveColor(i){if(!i)return'#8A2BE2';const r=i.trim();if(/^#?[0-9A-Fa-f]{6}$/.test(r.replace('#','')))return r.startsWith('#')?r:`#${r}`;const k=r.toLowerCase();return COLOR_NAMES[k]||'#8A2BE2';}

const DATA_DIR=path.join(process.cwd(),'data');
const DATA_FILE=path.join(DATA_DIR,'panels.json');
const panels=new Map();let nextId=1;
function save(){try{if(!fs.existsSync(DATA_DIR))fs.mkdirSync(DATA_DIR,{recursive:true});const d={nextId,panels:[...panels.entries()].map(([id,p])=>[id,serializePanel(p)])};fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2));}catch(e){}}
function load(){try{if(!fs.existsSync(DATA_FILE))return;const d=JSON.parse(fs.readFileSync(DATA_FILE,'utf-8'));nextId=d.nextId||1;for(const[id,p]of d.panels)panels.set(parseInt(id),deserializePanel(p));console.log(`[SELL] ${panels.size} painéis carregados.`);}catch(e){console.error('[SELL] Load:',e.message);}}
function serializePanel(p){return{id:p.id,guildId:p.guildId,ownerId:p.ownerId,channelId:p.channelId,title:p.title,description:p.description,price:p.price,externalPrice:p.externalPrice,deliveryType:p.deliveryType,iconUrl:p.iconUrl,bannerUrl:p.bannerUrl,showStock:p.showStock,showSold:p.showSold,lockStock:p.lockStock,color:p.color,showThumbnail:p.showThumbnail,stock:p.stock,soldCount:p.soldCount,messageId:p.messageId,published:p.published,createdAt:p.createdAt?p.createdAt.toISOString():new Date().toISOString(),options:p.options?p.options.map(o=>({...o})):[]};}
function deserializePanel(r){return{...r,createdAt:new Date(r.createdAt||Date.now()),stock:(r.stock||[]).map(s=>typeof s==='string'?{content:s,used:false}:s),options:(r.options||[]).map(o=>({label:o.label,description:o.description,price:o.price,deliveryContent:o.deliveryContent||'',stockCount:o.stockCount||0,unlimited:o.unlimited!==undefined?o.unlimited:true}))};}
load();

function createPanel(g,i,c){const id=nextId++;const p={id,guildId:g,ownerId:i,channelId:c,title:'',description:'',price:'',externalPrice:'',deliveryType:'manual',iconUrl:'',bannerUrl:'',showStock:true,showSold:false,lockStock:false,color:'#8A2BE2',showThumbnail:true,stock:[],soldCount:0,messageId:null,published:false,createdAt:new Date(),options:[]};panels.set(id,p);save();return p;}
function getPanel(id){return panels.get(id)||null;}
function listPanels(g){return[...panels.values()].filter(p=>p.guildId===g);}
function deletePanel(id){const r=panels.delete(id);if(r)save();return r;}

function addOption(pid,{label,description,price,deliveryContent='',stockCount=0,unlimited=true}){
  const p=getPanel(pid);if(!p)return null;
  p.options.push({label:label.trim(),description:description.trim(),price:price.trim(),deliveryContent:deliveryContent.trim(),stockCount:parseInt(stockCount)||0,unlimited:unlimited!==false});
  save();return p.options[p.options.length-1];
}
function removeOption(pid,i){const p=getPanel(pid);if(!p||i<0||i>=p.options.length)return false;p.options.splice(i,1);save();return true;}
function addOptionStock(pid,optIdx,count){const p=getPanel(pid);if(!p||optIdx<0||optIdx>=p.options.length)return false;p.options[optIdx].stockCount+=parseInt(count)||0;save();return true;}
function setOptionUnlimited(pid,optIdx,unl){const p=getPanel(pid);if(!p||optIdx<0||optIdx>=p.options.length)return false;p.options[optIdx].unlimited=unl;save();return true;}
function consumeOptionStock(pid,optIdx){const p=getPanel(pid);if(!p||optIdx<0||optIdx>=p.options.length)return null;const o=p.options[optIdx];if(o.unlimited)return true;if(o.stockCount<=0)return null;o.stockCount--;p.soldCount++;save();return true;}

function buildPanelEmbed(panel){
  const cd=parseInt(resolveColor(panel.color).replace('#',''),16);
  const e=new EmbedBuilder().setTitle(panel.title||'Painel de Venda').setColor(cd);
  if(panel.description)e.setDescription(panel.description);
  if(panel.options.length>0){
    let ot='';
    for(const o of panel.options){
      const sc=o.unlimited?'♾️ Ilimitado':`📦 ${o.stockCount} disponíveis`;
      ot+=`**${o.label}** — ${o.price} — ${sc}\n${o.description}\n`;
    }
    e.addFields({name:'📋 Planos Disponíveis',value:ot.slice(0,1024)});
  }else if(panel.price){
    let pt=panel.price;if(panel.externalPrice)pt+=` ~~(R$ ${panel.externalPrice})~~`;
    e.addFields({name:'💰 Valor',value:pt,inline:true});
  }
  e.addFields({name:'📦 Entrega',value:panel.deliveryType==='auto'?'⚡ Automática':'👤 Manual',inline:true});
  if(panel.showStock){
    const av=panel.lockStock?panel.stock.length:panel.stock.filter(s=>!s.used).length;
    e.addFields({name:'📊 Estoque',value:panel.lockStock?`🔒 Ilimitado (${panel.stock.length})`:panel.stock.length?`${av}/${panel.stock.length} disponíveis`:'Sem estoque',inline:true});
  }
  if(panel.showSold)e.addFields({name:'🛒 Vendidos',value:`${panel.soldCount}`,inline:true});
  if(panel.showThumbnail&&panel.iconUrl)e.setThumbnail(panel.iconUrl);
  if(panel.bannerUrl)e.setImage(panel.bannerUrl);
  e.setFooter({text:'PRiMOBOT • Clique no botão abaixo para comprar'}).setTimestamp();
  return e;
}

function buildPurchaseButton(pid,panel){
  const hasStock=panel.lockStock||panel.stock.some(s=>!s.used)||panel.stock.length===0;
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`buy_${pid}`).setLabel('🛍️ Comprar').setStyle(ButtonStyle.Success).setDisabled(!hasStock&&panel.stock.length>0));
}

function buildOptionSelect(pid,panel){
  if(!panel.options.length)return null;
  const opts=panel.options.map((o,i)=>{
    const sc=o.unlimited?'♾️ Ilimitado':`📦 ${o.stockCount} disponíveis`;
    return new StringSelectMenuOptionBuilder().setLabel(o.label.slice(0,100)).setValue(`opt_${i}`).setDescription(`${o.price} • ${sc}`.slice(0,100));
  });
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`optselect_${pid}`).setPlaceholder('Escolha um plano').addOptions(opts));
}

function addStock(pid,items){const p=getPanel(pid);if(!p)return false;for(const i of items)p.stock.push({content:i,used:false});save();return true;}
function consumeStock(pid){const p=getPanel(pid);if(!p)return null;if(p.lockStock){const i=p.stock[0];if(!i)return null;p.soldCount++;save();return i.content;}const i=p.stock.find(s=>!s.used);if(!i)return null;i.used=true;p.soldCount++;save();return i.content;}

module.exports={COLOR_NAMES,resolveColor,createPanel,getPanel,listPanels,deletePanel,buildPanelEmbed,buildPurchaseButton,buildOptionSelect,addStock,consumeStock,addOption,removeOption,addOptionStock,setOptionUnlimited,consumeOptionStock};
