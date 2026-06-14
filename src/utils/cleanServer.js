const config = require('../config');

/**
 * Reseta o servidor ao padrão de fábrica:
 * - Remove todos os cargos (exceto @everyone e gerenciados)
 * - Remove todos os canais e categorias
 * - Define o nome padrão
 * - Define o ícone padrão
 *
 * @param {Guild} guild - Servidor a ser resetado
 * @returns {Promise<{name: string, iconSet: boolean, rolesDeleted: number, channelsDeleted: number, errors: number}>}
 */
async function cleanServer(guild) {
  const result = { name: config.defaultServerName, iconSet: false, rolesDeleted: 0, channelsDeleted: 0, errors: 0 };

  const channels = await guild.channels.fetch();
  for (const [id, channel] of channels) {
    try {
      await channel.delete('Clona-Me — Limpeza do servidor');
      result.channelsDeleted++;
      await sleep(config.rateLimitDelay);
    } catch (err) {
      console.error(`[ERRO] Falha ao deletar canal "${channel.name}":`, err.message);
      result.errors++;
    }
  }

  const roles = await guild.roles.fetch();
  for (const [id, role] of roles) {
    if (role.name === '@everyone' || role.managed) continue;
    try {
      await role.delete('Clona-Me — Limpeza do servidor');
      result.rolesDeleted++;
      await sleep(config.rateLimitDelay);
    } catch (err) {
      console.error(`[ERRO] Falha ao deletar cargo "${role.name}":`, err.message);
      result.errors++;
    }
  }

  try {
    await guild.setName(config.defaultServerName, 'Clona-Me — Restauração padrão');
    await sleep(config.rateLimitDelay);
  } catch (err) {
    console.error('[ERRO] Falha ao renomear servidor:', err.message);
    result.errors++;
  }

  if (config.defaultIconUrl) {
    try {
      const response = await fetch(config.defaultIconUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataUri = `data:image/png;base64,${base64}`;

      await guild.setIcon(dataUri, 'Clona-Me — Restauração padrão');
      result.iconSet = true;
    } catch (err) {
      console.error('[ERRO] Falha ao definir ícone padrão:', err.message);
      result.errors++;
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { cleanServer };
