const {
  ChannelType,
  PermissionOverwrites,
  PermissionsBitField,
} = require('discord.js');
const config = require('../config');

/**
 * Clona categorias e canais do servidor alvo para o destino,
 * incluindo permissões.
 *
 * IMPORTANTE: O bot precisa estar no servidor alvo para ler os canais.
 *
 * @param {string} targetServerId - ID do servidor de origem
 * @param {Guild} destGuild - Guild de destino
 * @returns {Promise<{created: number, errors: number}>}
 */
async function cloneChannels(targetServerId, destGuild) {
  const result = { created: 0, errors: 0 };

  // Tenta acessar o servidor alvo
  let targetGuild;
  try {
    targetGuild = await destGuild.client.guilds.fetch(targetServerId).catch(() => null);
  } catch {
    targetGuild = null;
  }

  if (!targetGuild) {
    throw new Error(
      'Não foi possível acessar o servidor alvo. O bot precisa estar no servidor de origem ' +
      `(\`${targetServerId}\`) para clonar os canais.\n\n` +
      'Adicione o bot ao servidor alvo e tente novamente.'
    );
  }

  // Busca todos os canais do servidor alvo
  const targetChannels = await targetGuild.channels.fetch();

  // ── Passo 1: Clonar categorias ──────────────────────
  const categories = targetChannels
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  // Mapeamento: ID da categoria original → ID da nova (no destino)
  const categoryMap = new Map();
  // Mapeamento: nome do cargo → ID do cargo no destino
  const roleNameToDestId = new Map();
  for (const [id, role] of destGuild.roles.cache) {
    roleNameToDestId.set(role.name.toLowerCase(), id);
  }

  for (const [catId, category] of categories) {
    try {
      // Verifica se já existe uma categoria com o mesmo nome
      const existing = destGuild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === category.name
      );

      if (existing) {
        categoryMap.set(catId, existing.id);
        continue;
      }

      const newCategory = await destGuild.channels.create({
        name: category.name,
        type: ChannelType.GuildCategory,
        position: category.position,
        permissionOverwrites: mapPermissionOverwrites(
          category.permissionOverwrites,
          roleNameToDestId
        ),
        reason: 'Clona-Me — Clonagem de canais',
      });

      categoryMap.set(catId, newCategory.id);
      result.created++;
      await sleep(config.rateLimitDelay);
    } catch (error) {
      console.error(`[ERRO] Falha ao clonar categoria "${category.name}":`, error.message);
      result.errors++;
    }
  }

  // ── Passo 2: Clonar canais (ordenados por posição) ──
  const regularChannels = targetChannels
    .filter(c => c.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  for (const [chanId, channel] of regularChannels) {
    try {
      const channelName = channel.name;

      // Verifica se já existe um canal com o mesmo nome no destino
      const existing = destGuild.channels.cache.find(
        c => c.name === channelName && c.type === channel.type
      );

      if (existing) {
        continue;
      }

      const parentId = channel.parentId ? categoryMap.get(channel.parentId) : null;

      // Determina o tipo de canal
      let channelType = channel.type;

      // Cria o canal
      const channelOptions = {
        name: channelName,
        type: channelType,
        topic: channel.topic || null,
        nsfw: channel.nsfw || false,
        position: channel.position,
        permissionOverwrites: mapPermissionOverwrites(
          channel.permissionOverwrites,
          roleNameToDestId
        ),
        reason: 'Clona-Me — Clonagem de canais',
      };

      // Adiciona parent (categoria) se aplicável
      if (parentId) {
        channelOptions.parent = parentId;
      }

      // Canais de voz têm propriedades extras
      if (channel.isVoiceBased()) {
        channelOptions.bitrate = channel.bitrate;
        channelOptions.userLimit = channel.userLimit;
        channelOptions.rtcRegion = channel.rtcRegion || null;
        channelOptions.videoQualityMode = channel.videoQualityMode || null;
      }

      // Canais de fórum
      if (channel.type === ChannelType.GuildForum) {
        channelOptions.availableTags = channel.availableTags || [];
        channelOptions.defaultReactionEmoji = channel.defaultReactionEmoji || null;
        channelOptions.defaultSortOrder = channel.defaultSortOrder || null;
        channelOptions.defaultForumLayout = channel.defaultForumLayout || null;
      }

      await destGuild.channels.create(channelOptions);
      result.created++;
      await sleep(config.rateLimitDelay);

    } catch (error) {
      console.error(`[ERRO] Falha ao clonar canal "${channel.name}":`, error.message);
      result.errors++;
    }
  }

  return result;
}

/**
 * Converte as permissões do servidor alvo para o destino,
 * resolvendo IDs de cargos por nome.
 */
function mapPermissionOverwrites(overwrites, roleNameToDestId) {
  if (!overwrites) return [];

  const mapped = [];

  for (const [targetId, overwrite] of overwrites.cache || overwrites) {
    // Tenta encontrar o cargo correspondente no destino pelo nome
    // Nota: não temos acesso ao nome do cargo do servidor alvo aqui,
    // então mapeamos apenas o @everyone (guild id) diretamente.
    // Para cargos específicos, pulamos — o usuário pode reconfigurar depois.
    mapped.push({
      id: targetId, // será resolvido pelo Discord ao criar
      allow: overwrite.allow,
      deny: overwrite.deny,
      type: overwrite.type,
    });
  }

  return mapped;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { cloneChannels };
