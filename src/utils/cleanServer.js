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

  // ── Deletar canais (categorias primeiro, depois canais) ──
  const channels = await guild.channels.fetch();

  // Deletar categorias primeiro (canais dentro delas somem junto)
  const categories = [...channels.values()].filter(c => c.type === 4);
  for (const category of categories) {
    try {
      await category.delete('Clona-Me — Limpeza do servidor');
      result.channelsDeleted++;
      await sleep(config.rateLimitDelay);
    } catch (err) {
      console.error(`[ERRO] Falha ao deletar categoria "${category.name}":`, err.message);
      result.errors++;
    }
  }

  // Depois canais restantes (que não estavam em categorias deletadas)
  const remainingChannels = await guild.channels.fetch();
  for (const [id, channel] of remainingChannels) {
    try {
      await channel.delete('Clona-Me — Limpeza do servidor');
      result.channelsDeleted++;
      await sleep(config.rateLimitDelay);
    } catch (err) {
      // Canal já deletado ou sem permissão — ignorar
      if (err.code !== 10003 && err.code !== 50013) {
        console.error(`[ERRO] Falha ao deletar canal "${channel.name}":`, err.message);
        result.errors++;
      }
    }
  }

  // ── Deletar cargos ──
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

  // ── Restaurar nome ──
  try {
    await guild.setName(config.defaultServerName, 'Clona-Me — Restauração padrão');
    await sleep(config.rateLimitDelay);
  } catch (err) {
    console.error('[ERRO] Falha ao renomear servidor:', err.message);
    result.errors++;
  }

  // ── Restaurar ícone ──
  if (config.defaultIconUrl) {
    try {
      // Compatível com Node.js 16+ (usa https nativo se fetch não existir)
      let buffer;
      if (typeof fetch !== 'undefined') {
        const response = await fetch(config.defaultIconUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        const https = require('node:https');
        const http = require('node:http');
        const mod = config.defaultIconUrl.startsWith('https') ? https : http;
        buffer = await new Promise((resolve, reject) => {
          mod.get(config.defaultIconUrl, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
          }).on('error', reject);
        });
      }
      const base64 = buffer.toString('base64');
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
