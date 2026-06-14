const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { listPanels, getPanel, buildPanelEmbed, deletePanel } = require('../utils/sellManager');

module.exports = {
  data: new SlashCommandBuilder().setName('editar').setDescription('Edita ou remove painéis de venda existentes').addStringOption(opt => opt.setName('painel_id').setDescription('ID do painel (deixe vazio para escolher da lista)').setRequired(false)),
  async execute(interaction) {
    if (!interaction.memberPermissions?.has('Administrator')) return interaction.reply({content:'Você precisa de permissão de **Administrador**.',ephemeral:true});
    const guildId = interaction.guildId; const panels = listPanels(guildId); const specificId = interaction.options.getString('painel_id');
    if (panels.length === 0) return interaction.reply({content:'Nenhum painel encontrado.',ephemeral:true});
    if (specificId) { const panel = getPanel(parseInt(specificId)); if (!panel) return interaction.reply({content:`Painel #${specificId} não encontrado.`,ephemeral:true}); return showEditMenu(interaction, panel); }
    const options = panels.slice(0,25).map(p => new StringSelectMenuOptionBuilder().setLabel(`#${p.id} — ${p.title}`.slice(0,100)).setValue(`panel_${p.id}`).setDescription(`Preço: ${p.price||'N/D'} • ${p.stock.length} itens • ${p.options.length} planos`));
    const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('edit_select_panel').setPlaceholder('Selecione um painel...').addOptions(options));
    const delOpts = panels.slice(0,25).map(p => new StringSelectMenuOptionBuilder().setLabel(`🗑️ #${p.id} — ${p.title}`.slice(0,100)).setValue(`delete_${p.id}`).setDescription(`${p.published?'Publicado':'Rascunho'} • ${p.stock.length} itens`));
    const delRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('edit_delete_multi').setPlaceholder('🗑️ Deletar múltiplos...').setMinValues(1).setMaxValues(Math.min(panels.length,25)).addOptions(delOpts));
    const embed = new EmbedBuilder().setTitle('✏️ Editar Painéis').setColor(0x5865F2).setDescription(`**${panels.length} painel(is)**.\nMenu 1: Editar\nMenu 2: Deletar`).setFooter({text:'Clona-Me'});
    await interaction.reply({embeds:[embed],components:[row,delRow],ephemeral:true});
  },
};

async function showEditMenu(interaction, panel) {
  const embed = buildPanelEmbed(panel);
  embed.setTitle(`✏️ Editando Painel #${panel.id}`);
  embed.setDescription((panel.description||'')+'\n\n⚠️ Use os botões abaixo.');

  const r1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_title_${panel.id}`).setLabel('📝 Título').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`editcfg_desc_${panel.id}`).setLabel('📄 Descrição').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`editcfg_price_${panel.id}`).setLabel('💰 Valor').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`editcfg_color_${panel.id}`).setLabel('🎨 Cor').setStyle(ButtonStyle.Primary),
  );
  const r2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_stock_${panel.id}`).setLabel('📦 Estoque').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_items_${panel.id}`).setLabel('🔄 Substituir').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_options_${panel.id}`).setLabel('📋 Planos').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_deliv_${panel.id}`).setLabel('📨 Entrega').setStyle(ButtonStyle.Secondary),
  );
  const r3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_icon_${panel.id}`).setLabel('🖼️ Ícone').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_banner_${panel.id}`).setLabel('🎨 Banner').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_display_${panel.id}`).setLabel('👁️ Exibição').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`editcfg_thumb_${panel.id}`).setLabel(`📌 Thumb: ${panel.showThumbnail?'ON':'OFF'}`).setStyle(ButtonStyle.Secondary),
  );
  const r4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`editcfg_delete_${panel.id}`).setLabel('🗑️ Deletar').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`editcfg_update_${panel.id}`).setLabel('🔄 Atualizar').setStyle(ButtonStyle.Success),
  );
  await interaction.reply({embeds:[embed],components:[r1,r2,r3,r4],ephemeral:true});
}

module.exports.showEditMenu = showEditMenu;
