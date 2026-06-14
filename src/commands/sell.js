const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { createPanel, getPanel, buildPanelEmbed, addStock, resolveColor, addOptionStock, setOptionUnlimited } = require('../utils/sellManager');

function buildStockModal(pid){return new ModalBuilder().setCustomId(`sell_stock_${pid}`).setTitle('Adicionar Estoque').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stock_items').setLabel('Itens (um por linha, separados por --)').setPlaceholder('item1\n--\nitem2\n--\nitem3').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stock_lock').setLabel('Travar estoque? (sim/não)').setPlaceholder('não').setStyle(TextInputStyle.Short).setRequired(false).setValue('não').setMaxLength(3)));}
function buildDeliveryModal(pid,c){return new ModalBuilder().setCustomId(`sell_delivery_${pid}`).setTitle('Entrega').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('delivery_type').setLabel('Tipo (manual/auto)').setPlaceholder('manual').setStyle(TextInputStyle.Short).setRequired(true).setValue(c||'manual').setMaxLength(6)));}
function buildIconModal(pid,c){return new ModalBuilder().setCustomId(`sell_icon_${pid}`).setTitle('Ícone').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icon_url').setLabel('URL do ícone').setPlaceholder('https://').setStyle(TextInputStyle.Short).setRequired(false).setValue(c||'').setMaxLength(400)));}
function buildBannerModal(pid,c){return new ModalBuilder().setCustomId(`sell_banner_${pid}`).setTitle('Banner').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner_url').setLabel('URL do banner').setPlaceholder('https://').setStyle(TextInputStyle.Short).setRequired(false).setValue(c||'').setMaxLength(400)));}
function buildDisplayModal(pid,p){return new ModalBuilder().setCustomId(`sell_display_${pid}`).setTitle('Exibição').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('show_stock').setLabel('Mostrar estoque? (sim/não)').setPlaceholder('sim').setStyle(TextInputStyle.Short).setRequired(false).setValue(p.showStock?'sim':'não').setMaxLength(3)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('show_sold').setLabel('Mostrar vendidos? (sim/não)').setPlaceholder('não').setStyle(TextInputStyle.Short).setRequired(false).setValue(p.showSold?'sim':'não').setMaxLength(3)));}
function buildOptionsModal(pid){return new ModalBuilder().setCustomId(`sell_options_add_${pid}`).setTitle('Adicionar Plano').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_label').setLabel('Nome do plano').setPlaceholder('Ex: Plano Básico').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_price').setLabel('Valor').setPlaceholder('Ex: R$ 5,00').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_desc').setLabel('Descrição (opcional)').setPlaceholder('O que inclui').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_stock').setLabel('Estoque (número ou 0 para ilimitado)').setPlaceholder('10').setStyle(TextInputStyle.Short).setRequired(false).setValue('0').setMaxLength(6)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_delivery').setLabel('Conteúdo da entrega (opcional)').setPlaceholder('Enviado ao cliente').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1800)));}

function buildConfigRows(panel){
  const b=(id,l,s)=>new ButtonBuilder().setCustomId(`${id}_${panel.id}`).setLabel(l).setStyle(s);
  return[
    new ActionRowBuilder().addComponents(b('sellcfg_stock','📦 Estoque',ButtonStyle.Primary),b('sellcfg_deliv','📨 Entrega',ButtonStyle.Primary),b('sellcfg_options','📋 Planos',ButtonStyle.Primary),b('sellcfg_icon','🖼️ Ícone',ButtonStyle.Secondary)),
    new ActionRowBuilder().addComponents(b('sellcfg_banner','🎨 Banner',ButtonStyle.Secondary),b('sellcfg_display','👁️ Exibição',ButtonStyle.Secondary),b('sellcfg_thumb',`📌 Thumb: ${panel.showThumbnail?'ON':'OFF'}`,ButtonStyle.Secondary),b('sellcfg_pub','🚀 Publicar',ButtonStyle.Success)),
    new ActionRowBuilder().addComponents(b('sellcfg_preview','👀 Preview',ButtonStyle.Secondary)),
  ];
}

module.exports={
  data:new SlashCommandBuilder().setName('venda').setDescription('Cria um painel de venda completo').addChannelOption(o=>o.setName('canal').setDescription('Canal onde o painel será publicado').setRequired(true)),
  async execute(i){
    try{
      if(!i.memberPermissions?.has('Administrator'))return i.reply({content:'🔒 Staff.',ephemeral:true});
      const ch=i.options.getChannel('canal');if(!ch||(ch.type!==0&&ch.type!=='GUILD_TEXT'))return i.reply({content:'Canal de texto inválido.',ephemeral:true});
      const p=createPanel(i.guildId,i.user.id,ch.id);
      const m=new ModalBuilder().setCustomId(`sell_modal_${p.id}`).setTitle('Criar Painel');
      m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_title').setLabel('Título').setPlaceholder('Ex: 🔥 Assinatura Netflix').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)));
      m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_desc').setLabel('Descrição').setPlaceholder('Descreva o produto...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)));
      m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_price').setLabel('Valor').setPlaceholder('R$ 19,90').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60)));
      m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_extprice').setLabel('Valor real (fora)').setPlaceholder('R$ 55,90').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(60)));
      m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_color').setLabel('Cor (HEX ou nome)').setPlaceholder('#8A2BE2 ou roxo').setStyle(TextInputStyle.Short).setRequired(false).setValue('#8A2BE2').setMaxLength(32)));
      await i.showModal(m);
    }catch(e){console.error('[VENDA]',e.message);try{if(!i.replied)i.reply({content:`❌ ${e.message.slice(0,200)}`,ephemeral:true});}catch(_){}}
  },
  async handleModal(i){
    try{
      const pid=parseInt(i.customId.replace('sell_modal_',''));const p=getPanel(pid);if(!p)return i.reply({content:'Painel não encontrado.',ephemeral:true});
      p.title=i.fields.getTextInputValue('sell_title').trim();p.description=i.fields.getTextInputValue('sell_desc').trim();
      p.price=i.fields.getTextInputValue('sell_price').trim();p.externalPrice=i.fields.getTextInputValue('sell_extprice').trim();
      const cv=i.fields.getTextInputValue('sell_color').trim();if(cv)p.color=resolveColor(cv);
      const e=buildPanelEmbed(p);e.setTitle('🔧 Configurar — Preview');e.setDescription((p.description||'')+'\n\n⚠️ Salvo automaticamente.');
      await i.reply({embeds:[e],components:buildConfigRows(p),ephemeral:true});
    }catch(e){console.error('[VENDA modal]',e.message);try{if(!i.replied)i.reply({content:`❌ ${e.message.slice(0,200)}`,ephemeral:true});}catch(_){}}
  },
};

module.exports.buildStockModal=buildStockModal;module.exports.buildDeliveryModal=buildDeliveryModal;module.exports.buildIconModal=buildIconModal;module.exports.buildBannerModal=buildBannerModal;module.exports.buildDisplayModal=buildDisplayModal;module.exports.buildOptionsModal=buildOptionsModal;module.exports.buildConfigRows=buildConfigRows;
