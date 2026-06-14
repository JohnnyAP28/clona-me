const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { createPanel, getPanel, buildPanelEmbed, buildPurchaseButton, addStock, resolveColor } = require('../utils/sellManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('venda')
    .setDescription('Cria um painel de venda completo')
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal onde o painel será publicado').setRequired(true)),

  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has('Administrator')) return interaction.reply({content:'Você precisa de permissão de **Administrador**.',ephemeral:true});
      const channel = interaction.options.getChannel('canal');
      if (!channel || (channel.type !== 0 && channel.type !== 'GUILD_TEXT')) return interaction.reply({content:'Selecione um canal de texto válido.',ephemeral:true});
      const panel = createPanel(interaction.guildId, interaction.user.id, channel.id);

      const modal = new ModalBuilder().setCustomId(`sell_modal_${panel.id}`).setTitle('Criar Painel de Venda');
      const titleInput = new TextInputBuilder().setCustomId('sell_title').setLabel('Título do painel').setPlaceholder('Ex: 🔥 Assinatura Netflix Premium 12 meses').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256);
      const descInput = new TextInputBuilder().setCustomId('sell_desc').setLabel('Descrição').setPlaceholder('Descreva o produto, benefícios, garantia...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000);
      const priceInput = new TextInputBuilder().setCustomId('sell_price').setLabel('Valor de venda').setPlaceholder('Ex: R$ 19,90').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60);
      const extPriceInput = new TextInputBuilder().setCustomId('sell_extprice').setLabel('Valor real (fora do Discord)').setPlaceholder('Ex: R$ 55,90').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(60);
      const colorInput = new TextInputBuilder().setCustomId('sell_color').setLabel('Cor (HEX ou nome: roxo/azul/vermelho...)').setPlaceholder('#8A2BE2 ou roxo').setStyle(TextInputStyle.Short).setRequired(false).setValue('#8A2BE2').setMaxLength(32);
      modal.addComponents(new ActionRowBuilder().addComponents(titleInput),new ActionRowBuilder().addComponents(descInput),new ActionRowBuilder().addComponents(priceInput),new ActionRowBuilder().addComponents(extPriceInput),new ActionRowBuilder().addComponents(colorInput));
      await interaction.showModal(modal);
    } catch (err) { console.error('[VENDA]',err.message); try{if(!interaction.replied)await interaction.reply({content:`❌ Erro: ${err.message.slice(0,200)}`,ephemeral:true});}catch(_){} }
  },

  async handleModal(interaction) {
    try {
      const panelId = parseInt(interaction.customId.replace('sell_modal_',''));
      const panel = getPanel(panelId);
      if (!panel) return interaction.reply({content:'Painel não encontrado.',ephemeral:true});
      panel.title = interaction.fields.getTextInputValue('sell_title').trim();
      panel.description = interaction.fields.getTextInputValue('sell_desc').trim();
      panel.price = interaction.fields.getTextInputValue('sell_price').trim();
      panel.externalPrice = interaction.fields.getTextInputValue('sell_extprice').trim();
      const cv = interaction.fields.getTextInputValue('sell_color').trim();
      if (cv) panel.color = resolveColor(cv);
      const embed = buildPanelEmbed(panel);
      embed.setTitle('🔧 Configurar Painel — Preview');
      embed.setDescription((panel.description||'')+'\n\n⚠️ Tudo salvo automaticamente. Clique em **Publicar Agora** quando pronto.');
      await interaction.reply({embeds:[embed],components:buildConfigRows(panel),ephemeral:true});
    } catch(err) { console.error('[VENDA modal]',err.message); try{if(!interaction.replied)await interaction.reply({content:`❌ Erro: ${err.message.slice(0,200)}`,ephemeral:true});}catch(_){} }
  },
};

function buildConfigRows(panel) {
  const r1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sellcfg_stock_${panel.id}`).setLabel('📦 Estoque').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sellcfg_deliv_${panel.id}`).setLabel('📨 Entrega').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sellcfg_options_${panel.id}`).setLabel('📋 Planos').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sellcfg_icon_${panel.id}`).setLabel('🖼️ Ícone').setStyle(ButtonStyle.Secondary),
  );
  const r2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sellcfg_banner_${panel.id}`).setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sellcfg_display_${panel.id}`).setLabel('👁️ Exibição').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sellcfg_thumb_${panel.id}`).setLabel(`📌 Thumb: ${panel.showThumbnail?'ON':'OFF'}`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sellcfg_pub_${panel.id}`).setLabel('🚀 Publicar').setStyle(ButtonStyle.Success),
  );
  const r3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sellcfg_preview_${panel.id}`).setLabel('👀 Preview').setStyle(ButtonStyle.Secondary),
  );
  return [r1,r2,r3];
}

function buildStockModal(panelId) { return new ModalBuilder().setCustomId(`sell_stock_${panelId}`).setTitle('Adicionar Estoque').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stock_items').setLabel('Itens (um por linha, separados por --)').setPlaceholder('item1\n--\nitem2\n--\nitem3').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stock_lock').setLabel('Travar estoque? (sim/não)').setPlaceholder('não').setStyle(TextInputStyle.Short).setRequired(false).setValue('não').setMaxLength(3))); }
function buildDeliveryModal(panelId, current) { return new ModalBuilder().setCustomId(`sell_delivery_${panelId}`).setTitle('Configurar Entrega').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('delivery_type').setLabel('Tipo (manual/auto)').setPlaceholder('manual').setStyle(TextInputStyle.Short).setRequired(true).setValue(current||'manual').setMaxLength(6))); }
function buildIconModal(panelId, cu) { return new ModalBuilder().setCustomId(`sell_icon_${panelId}`).setTitle('Ícone / Thumbnail').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icon_url').setLabel('URL do ícone').setPlaceholder('https://i.imgur.com/...').setStyle(TextInputStyle.Short).setRequired(false).setValue(cu||'').setMaxLength(400))); }
function buildBannerModal(panelId, cu) { return new ModalBuilder().setCustomId(`sell_banner_${panelId}`).setTitle('Banner / Imagem').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner_url').setLabel('URL do banner').setPlaceholder('https://i.imgur.com/...').setStyle(TextInputStyle.Short).setRequired(false).setValue(cu||'').setMaxLength(400))); }
function buildDisplayModal(panelId, p) { return new ModalBuilder().setCustomId(`sell_display_${panelId}`).setTitle('Configurar Exibição').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('show_stock').setLabel('Mostrar estoque? (sim/não)').setPlaceholder('sim').setStyle(TextInputStyle.Short).setRequired(false).setValue(p.showStock?'sim':'não').setMaxLength(3)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('show_sold').setLabel('Mostrar vendidos? (sim/não)').setPlaceholder('não').setStyle(TextInputStyle.Short).setRequired(false).setValue(p.showSold?'sim':'não').setMaxLength(3))); }
function buildOptionsModal(panelId) { return new ModalBuilder().setCustomId(`sell_options_add_${panelId}`).setTitle('Adicionar Plano/Opção').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_label').setLabel('Nome do plano').setPlaceholder('Ex: Plano Básico').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_price').setLabel('Valor').setPlaceholder('Ex: R$ 5,00').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_desc').setLabel('Descrição do plano (opcional)').setPlaceholder('O que inclui este plano').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('opt_delivery').setLabel('Conteúdo da entrega (opcional)').setPlaceholder('O que será enviado ao cliente').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1800))); }

module.exports.buildStockModal = buildStockModal;
module.exports.buildDeliveryModal = buildDeliveryModal;
module.exports.buildIconModal = buildIconModal;
module.exports.buildBannerModal = buildBannerModal;
module.exports.buildDisplayModal = buildDisplayModal;
module.exports.buildOptionsModal = buildOptionsModal;
module.exports.buildConfigRows = buildConfigRows;
