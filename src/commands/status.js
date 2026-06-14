const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra informações completas do servidor e do bot'),

  async execute(interaction) {
    const guild = interaction.guild;
    const bot = interaction.client;

    // Servidor
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;
    const roles = guild.roles.cache.size;
    const channels = guild.channels.cache.size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const emojis = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier || 0;
    const createdAt = Math.floor(guild.createdTimestamp / 1000);

    // Bot
    const uptime = Math.floor(process.uptime());
    const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ping = Date.now() - interaction.createdTimestamp;
    const totalServers = bot.guilds.cache.size;
    const totalUsers = bot.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const { listPanels } = require('../utils/sellManager');
    const panels = listPanels(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Status — ${guild.name}`)
      .setColor(0x5865F2)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || bot.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👑 Dono', value: `<@${guild.ownerId}>`, inline: true },
        { name: '🆔 Servidor', value: `\`${guild.id}\``, inline: true },
        { name: '📅 Criado em', value: `<t:${createdAt}:D>`, inline: true },
        { name: '👥 Membros', value: `${totalMembers} (🟢 ${onlineMembers} online)`, inline: true },
        { name: '💬 Canais', value: `${textChannels} texto • ${voiceChannels} voz • ${categories} categorias`, inline: true },
        { name: '🎭 Cargos', value: `${roles}`, inline: true },
        { name: '😀 Emojis', value: `${emojis}`, inline: true },
        { name: '🚀 Boost', value: `Nível ${boostLevel}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '🤖 Bot', value: `<@${bot.user.id}>`, inline: true },
        { name: '⏱️ Uptime', value: uptimeStr, inline: true },
        { name: '📶 Ping', value: `${ping}ms`, inline: true },
        { name: '💾 RAM', value: `${memory} MB`, inline: true },
        { name: '🌐 Servidores', value: `${totalServers}`, inline: true },
        { name: '👤 Usuários', value: `${totalUsers}`, inline: true },
        { name: '🛒 Painéis', value: `${panels.length} ativos`, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '🔗 Convite', value: `[discord.gg/hykfavEur](https://discord.gg/hykfavEur)`, inline: true },
        { name: '📋 Versão', value: 'Clona-Me v2.0', inline: true },
      )
      .setFooter({ text: 'Clona-Me • /status' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
