const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { listPanels, getPanel, buildPanelEmbed, deletePanel } = require('../utils/sellManager');

module.exports = {
  data: new SlashCommandBuilder().setName('editar').setDescription('Edita ou remove painéis').addStringOption(o => o.setName('id').setDescription('ID do painel').setRequired(false)),
  async execute(i) {
    if (!i.memberPermissions?.has('Administrator')) return i.reply({ content: '🔒 Staff.', ephemeral: true });
    const panels = listPanels(i.guildId); const sid = i.options.getString('id');
    if (!panels.length) return i.reply({ content: 'Nenhum painel.', ephemeral: true });
    if (sid) { const p = getPanel(parseInt(sid)); if (!p) return i.reply({ content: `Painel #${sid} não encontrado.`, ephemeral: true }); return showEditMenu(i, p); }
    const opts = panels.slice(0, 25).map(p => new StringSelectMenuOptionBuilder().setLabel(`#${p.id} — ${p.title}`.slice(0, 100)).setValue(`panel_${p.id}`).setDescription(`R$ ${p.price || 'N/D'} • ${p.options.length} planos`));
    const delOpts = panels.slice(0, 25).map(p => new StringSelectMenuOptionBuilder().setLabel(`🗑️ #${p.id} — ${p.title}`.slice(0, 100)).setValue(`delete_${p.id}`).setDescription(`${p.published ? 'Publicado' : 'Rascunho'}`));
    await i.reply({ embeds: [new EmbedBuilder().setTitle('✏️ Editar Painéis').setColor(0x5865F2).setDescription(`${panels.length} painéis.`).setFooter({ text: 'PRiMOBOT' })], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('edit_select_panel').setPlaceholder('Selecionar...').addOptions(opts)), new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('edit_delete_multi').setPlaceholder('Deletar múltiplos...').setMinValues(1).setMaxValues(Math.min(panels.length, 25)).addOptions(delOpts))], ephemeral: true });
  },
};

async function showEditMenu(i, panel) {
  const e = buildPanelEmbed(panel); e.setTitle(`✏️ Editando #${panel.id}`); e.setDescription((panel.description || '') + '\n\n⚠️ Salvo.');
  const b = (id, label, style) => new ButtonBuilder().setCustomId(`${id}_${panel.id}`).setLabel(label).setStyle(style);
  await i.reply({ embeds: [e], components: [new ActionRowBuilder().addComponents(b('editcfg_title', '📝 Título', ButtonStyle.Primary), b('editcfg_desc', '📄 Descrição', ButtonStyle.Primary), b('editcfg_price', '💰 Valor', ButtonStyle.Primary), b('editcfg_color', '🎨 Cor', ButtonStyle.Primary)), new ActionRowBuilder().addComponents(b('editcfg_stock', '📦 Estoque', ButtonStyle.Secondary), b('editcfg_items', '🔄 Substituir', ButtonStyle.Secondary), b('editcfg_options', '📋 Planos', ButtonStyle.Secondary), b('editcfg_deliv', '📨 Entrega', ButtonStyle.Secondary)), new ActionRowBuilder().addComponents(b('editcfg_icon', '🖼️ Ícone', ButtonStyle.Secondary), b('editcfg_banner', '🎨 Banner', ButtonStyle.Secondary), b('editcfg_display', '👁️ Exibição', ButtonStyle.Secondary), b('editcfg_thumb', `📌 Thumb: ${panel.showThumbnail ? 'ON' : 'OFF'}`, ButtonStyle.Secondary)), new ActionRowBuilder().addComponents(b('editcfg_delete', '🗑️ Deletar', ButtonStyle.Danger), b('editcfg_update', '🔄 Atualizar', ButtonStyle.Success))], ephemeral: true });
}

module.exports.showEditMenu = showEditMenu;
