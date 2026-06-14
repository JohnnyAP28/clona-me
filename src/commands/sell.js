const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { createPanel, getPanel, buildPanelEmbed, buildPurchaseButton, addStock } = require('../utils/sellManager');

// ── /venda ─────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('venda')
    .setDescription('Cria um painel de venda completo')
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal onde o painel será publicado')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({
        content: 'Você precisa de permissão de **Administrador** para usar este comando.',
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel('canal');
    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: 'Selecione um canal de texto válido.', ephemeral: true });
    }

    const panel = createPanel(interaction.guildId, interaction.user.id, channel.id);

    const modal = new ModalBuilder()
      .setCustomId(`sell_modal_${panel.id}`)
      .setTitle('Criar Painel de Venda');

    const titleInput = new TextInputBuilder()
      .setCustomId('sell_title')
      .setLabel('Título do painel')
      .setPlaceholder('Ex: 🔥 Assinatura Netflix Premium 12 meses')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(180);

    const descInput = new TextInputBuilder()
      .setCustomId('sell_desc')
      .setLabel('Descrição')
      .setPlaceholder('Descreva o produto, benefícios, garantia...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1800);

    const priceInput = new TextInputBuilder()
      .setCustomId('sell_price')
      .setLabel('Valor de venda')
      .setPlaceholder('Ex: R$ 19,90')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(60);

    const extPriceInput = new TextInputBuilder()
      .setCustomId('sell_extprice')
      .setLabel('Valor real (fora do Discord)')
      .setPlaceholder('Ex: R$ 55,90 — mostra o desconto')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(60);

    const colorInput = new TextInputBuilder()
      .setCustomId('sell_color')
      .setLabel('Cor da embed (HEX)')
      .setPlaceholder('#8A2BE2')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue('#8A2BE2')
      .setMaxLength(16);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(priceInput),
      new ActionRowBuilder().addComponents(extPriceInput),
      new ActionRowBuilder().addComponents(colorInput),
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    // Extrai o panel ID do customId
    const panelId = parseInt(interaction.customId.replace('sell_modal_', ''));
    const panel = getPanel(panelId);

    if (!panel) {
      return interaction.reply({ content: 'Painel não encontrado. Use /venda novamente.', ephemeral: true });
    }

    // Salva dados do modal
    panel.title = interaction.fields.getTextInputValue('sell_title').trim();
    panel.description = interaction.fields.getTextInputValue('sell_desc').trim();
    panel.price = interaction.fields.getTextInputValue('sell_price').trim();
    panel.externalPrice = interaction.fields.getTextInputValue('sell_extprice').trim();
    const colorVal = interaction.fields.getTextInputValue('sell_color').trim();
    if (colorVal) panel.color = colorVal;

    // Responde com o painel de configuração
    const embed = buildPanelEmbed(panel);
    embed.setTitle('🔧 Configurar Painel — Preview');
    embed.setDescription(
      panel.description + '\n\n' +
      '**Use os botões abaixo para configurar o painel.**\n' +
      'Quando estiver pronto, clique em **Publicar Agora**.'
    );

    await interaction.reply({
      embeds: [embed],
      components: buildConfigRows(panel),
      ephemeral: true,
    });
  },
};

// ── Builder Views ──────────────────────────────────────

function buildConfigRows(panel) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sell_config_stock_${panel.id}`).setLabel('📦 Estoque').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sell_config_delivery_${panel.id}`).setLabel('📨 Entrega').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`sell_config_icon_${panel.id}`).setLabel('🖼️ Ícone').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sell_config_banner_${panel.id}`).setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sell_config_display_${panel.id}`).setLabel('👁️ Exibição').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sell_config_thumb_${panel.id}`).setLabel('📌 Thumbnail').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`sell_config_publish_${panel.id}`).setLabel('🚀 Publicar Agora').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`sell_config_preview_${panel.id}`).setLabel('👀 Preview').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2];
}

// ── Modal de Estoque ───────────────────────────────────
function buildStockModal(panelId) {
  return new ModalBuilder()
    .setCustomId(`sell_stock_${panelId}`)
    .setTitle('Adicionar Estoque')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('stock_items')
          .setLabel('Itens (separados por --)')
          .setPlaceholder('login:senha1 -- login:senha2 -- login:senha3')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('stock_lock')
          .setLabel('Travar estoque? (sim/não)')
          .setPlaceholder('não')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue('não')
          .setMaxLength(3)
      )
    );
}

// ── Modal de Entrega ───────────────────────────────────
function buildDeliveryModal(panelId, currentType) {
  return new ModalBuilder()
    .setCustomId(`sell_delivery_${panelId}`)
    .setTitle('Configurar Entrega')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('delivery_type')
          .setLabel('Tipo (manual/auto)')
          .setPlaceholder(currentType || 'manual')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(currentType || 'manual')
          .setMaxLength(6)
      )
    );
}

// ── Modal de Ícone ─────────────────────────────────────
function buildIconModal(panelId, currentUrl) {
  return new ModalBuilder()
    .setCustomId(`sell_icon_${panelId}`)
    .setTitle('Ícone / Thumbnail')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('icon_url')
          .setLabel('URL do ícone')
          .setPlaceholder('https://i.imgur.com/...')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(currentUrl || '')
          .setMaxLength(400)
      )
    );
}

// ── Modal de Banner ────────────────────────────────────
function buildBannerModal(panelId, currentUrl) {
  return new ModalBuilder()
    .setCustomId(`sell_banner_${panelId}`)
    .setTitle('Banner / Imagem')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('banner_url')
          .setLabel('URL do banner')
          .setPlaceholder('https://i.imgur.com/...')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(currentUrl || '')
          .setMaxLength(400)
      )
    );
}

// ── Modal de Exibição ──────────────────────────────────
function buildDisplayModal(panelId, panel) {
  return new ModalBuilder()
    .setCustomId(`sell_display_${panelId}`)
    .setTitle('Configurar Exibição')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('show_stock')
          .setLabel('Mostrar estoque? (sim/não)')
          .setPlaceholder('sim')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(panel.showStock ? 'sim' : 'não')
          .setMaxLength(3)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('show_sold')
          .setLabel('Mostrar vendidos? (sim/não)')
          .setPlaceholder('não')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(panel.showSold ? 'sim' : 'não')
          .setMaxLength(3)
      )
    );
}

// ── Select de Posição Thumbnail ────────────────────────
function buildThumbSelect(panelId, current) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sell_thumb_${panelId}`)
      .setPlaceholder('Posição do thumbnail')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Topo').setValue('top').setDescription('Imagem no topo do embed').setDefault(current === 'top'),
        new StringSelectMenuOptionBuilder().setLabel('Meio').setValue('middle').setDescription('Imagem abaixo do preço').setDefault(current === 'middle'),
        new StringSelectMenuOptionBuilder().setLabel('Fim').setValue('bottom').setDescription('Imagem no final do embed').setDefault(current === 'bottom'),
        new StringSelectMenuOptionBuilder().setLabel('Sem thumbnail').setValue('none').setDescription('Não mostrar ícone').setDefault(current === 'none'),
      )
  );
}

module.exports.buildStockModal = buildStockModal;
module.exports.buildDeliveryModal = buildDeliveryModal;
module.exports.buildIconModal = buildIconModal;
module.exports.buildBannerModal = buildBannerModal;
module.exports.buildDisplayModal = buildDisplayModal;
module.exports.buildThumbSelect = buildThumbSelect;
module.exports.buildConfigRows = buildConfigRows;
