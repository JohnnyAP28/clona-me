const { OAuth2Scopes } = require('discord.js');

/**
 * Verifica se o bot tem acesso ao servidor alvo.
 * Se não tiver, retorna um link de convite para o usuário adicionar o bot.
 *
 * @param {string} targetServerId
 * @param {Client} client
 * @returns {Promise<{guild: Guild|null, inviteUrl: string|null}>}
 */
async function ensureGuildAccess(targetServerId, client) {
  // Tenta buscar o servidor alvo
  let guild;
  try {
    guild = await client.guilds.fetch(targetServerId).catch(() => null);
  } catch {
    guild = null;
  }

  if (guild) {
    return { guild, inviteUrl: null };
  }

  // Gera link de convite com permissão de Administrador
  const inviteUrl = client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: ['Administrator'],
    guild: targetServerId, // pré-seleciona o servidor alvo
  });

  return { guild: null, inviteUrl };
}

/**
 * Aguarda o bot entrar no servidor alvo (polling por até 60s).
 * @param {string} targetServerId
 * @param {Client} client
 * @param {number} timeoutMs
 * @returns {Promise<Guild|null>}
 */
async function waitForGuildJoin(targetServerId, client, timeoutMs = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const guild = await client.guilds.fetch(targetServerId).catch(() => null);
      if (guild) return guild;
    } catch {
      // ainda não entrou
    }
    await sleep(3000); // espera 3s entre tentativas
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { ensureGuildAccess, waitForGuildJoin };
