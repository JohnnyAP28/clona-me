const config = require('../config');

/**
 * Reseta o servidor ao padrão de fábrica:
 * - Remove todos os cargos (exceto @everyone e gerenciados)
 * - Remove todos os canais e categorias
 * - Define o nome padrão
 * - Define o ícone padrão
 * - Cria a categoria "💻・Comandos" com canal "⌨️・comandos"
 *
 * @param {Guild} guild - Servidor a ser resetado
 * @returns {Promise<{name: string, iconSet: boolean, rolesDeleted: number, channelsDeleted: number, errors: number, factoryChannelCreated: boolean}>}
 */
async function cleanServer(guild) {
  const result = { name: config.defaultServerName, iconSet: false, rolesDeleted: 0, channelsDeleted: 0, errors: 0, factoryChannelCreated: false };

  // ── Deletar canais (categorias primeiro, depois canais) ──
  const channels = await guild.channels.fetch();
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

  const remainingChannels = await guild.channels.fetch();
  for (const [id, channel] of remainingChannels) {
    try {
      await channel.delete('Clona-Me — Limpeza do servidor');
      result.channelsDeleted++;
      await sleep(config.rateLimitDelay);
    } catch (err) {
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
      const iconBuffer = await downloadImage(config.defaultIconUrl);
      const base64 = iconBuffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64}`;
      await guild.setIcon(dataUri, 'Clona-Me — Restauração padrão');
      result.iconSet = true;
    } catch (err) {
      console.error('[ERRO] Falha ao definir ícone padrão:', err.message);
      result.errors++;
    }
  }

  // ── Criar categoria e canal de fábrica ──
  try {
    const factoryCategory = await guild.channels.create({
      name: config.factoryCategory,
      type: 4, // CategoryChannel
      reason: 'Clona-Me — Modo fábrica',
    });
    await sleep(config.rateLimitDelay);

    await guild.channels.create({
      name: config.factoryChannel,
      type: 0, // TextChannel
      parent: factoryCategory.id,
      topic: 'Use /resetar para formatar o servidor. Use /venda para criar um painel de vendas.',
      reason: 'Clona-Me — Modo fábrica',
    });
    result.factoryChannelCreated = true;
  } catch (err) {
    console.error('[ERRO] Falha ao criar canais de fábrica:', err.message);
    result.errors++;
  }

  return result;
}

/**
 * Baixa uma imagem como Buffer, com fallback para Node.js < 18
 */
async function downloadImage(url) {
  if (typeof fetch !== 'undefined') {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  // Fallback para Node.js antigo
  const mod = url.startsWith('https') ? require('node:https') : require('node:http');
  return new Promise((resolve, reject) => {
    mod.get(url, (res) => {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { cleanServer };
