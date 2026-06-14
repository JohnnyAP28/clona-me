const { PermissionsBitField } = require('discord.js');
const config = require('../config');

/**
 * Clona cargos de um servidor alvo para o servidor de destino.
 *
 * @param {Guild} targetGuild - Guild de origem (bot precisa estar nela)
 * @param {Guild} destGuild - Guild de destino (onde o bot está)
 * @returns {Promise<{created: number, skipped: number, errors: number}>}
 */
async function cloneRoles(targetGuild, destGuild) {
  const result = { created: 0, skipped: 0, errors: 0 };

  // Busca todos os cargos do servidor alvo
  const targetRoles = await targetGuild.roles.fetch();

  // Filtra: remove @everyone e cargos gerenciados por integração/bot
  const rolesToClone = targetRoles
    .filter(r => !r.managed && r.name !== '@everyone')
    .sort((a, b) => b.position - a.position) // ordem decrescente (mais alto primeiro)
    .values();

  // Mapeia cargos existentes no destino para evitar duplicatas
  const existingRoleNames = new Set(
    destGuild.roles.cache.map(r => r.name.toLowerCase())
  );

  for (const role of rolesToClone) {
    try {
      if (existingRoleNames.has(role.name.toLowerCase())) {
        result.skipped++;
        continue;
      }

      // Cria o cargo com as mesmas propriedades
      const newRole = await destGuild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        permissions: role.permissions,
        mentionable: role.mentionable,
        position: role.position,
        reason: 'Clona-Me — Clonagem de cargos',
      });

      existingRoleNames.add(newRole.name.toLowerCase());
      result.created++;

      // Delay anti-rate-limit
      await sleep(config.rateLimitDelay);
    } catch (error) {
      console.error(`[ERRO] Falha ao clonar cargo "${role.name}":`, error.message);
      result.errors++;
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { cloneRoles };
