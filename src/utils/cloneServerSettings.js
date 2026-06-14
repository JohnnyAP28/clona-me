const config = require('../config');

/**
 * Aplica as configurações do servidor alvo no servidor de destino.
 *
 * Configurações copiadas:
 *  - Nome do servidor
 *  - Ícone
 *  - Nível de verificação
 *  - Modo de conteúdo explícito
 *  - Notificações padrão
 *  - Região (se disponível)
 *
 * IMPORTANTE: O bot precisa estar no servidor alvo para ler as configurações.
 *
 * @param {string} targetServerId - ID do servidor de origem
 * @param {Guild} destGuild - Guild de destino
 * @returns {Promise<{applied: number, errors: number}>}
 */
async function cloneServerSettings(targetServerId, destGuild) {
  const result = { applied: 0, errors: 0 };

  let targetGuild;
  try {
    targetGuild = await destGuild.client.guilds.fetch(targetServerId).catch(() => null);
  } catch {
    targetGuild = null;
  }

  if (!targetGuild) {
    throw new Error(
      'Não foi possível acessar o servidor alvo. O bot precisa estar no servidor de origem ' +
      `(\`${targetServerId}\`) para ler as configurações.\n\n` +
      'Adicione o bot ao servidor alvo e tente novamente.'
    );
  }

  const settingsToApply = [];

  // Nome do servidor
  if (targetGuild.name && targetGuild.name !== destGuild.name) {
    settingsToApply.push({
      label: 'Nome',
      fn: () => destGuild.setName(targetGuild.name, 'Clona-Me — Clonagem de configurações'),
    });
  }

  // Ícone
  if (targetGuild.icon) {
    try {
      const iconURL = targetGuild.iconURL({ size: 1024, extension: 'png' });
      if (iconURL) {
        const response = await fetch(iconURL);
        const buffer = await response.arrayBuffer();
        const iconBase64 = Buffer.from(buffer).toString('base64');
        const dataUri = `data:image/png;base64,${iconBase64}`;

        settingsToApply.push({
          label: 'Ícone',
          fn: () => destGuild.setIcon(dataUri, 'Clona-Me — Clonagem de configurações'),
        });
      }
    } catch (err) {
      console.error('[ERRO] Falha ao baixar ícone:', err.message);
    }
  }

  // Nível de verificação
  if (targetGuild.verificationLevel !== undefined) {
    settingsToApply.push({
      label: 'Nível de Verificação',
      fn: () => destGuild.setVerificationLevel(targetGuild.verificationLevel),
    });
  }

  // Modo de conteúdo explícito
  if (targetGuild.explicitContentFilter !== undefined) {
    settingsToApply.push({
      label: 'Filtro de Conteúdo',
      fn: () => destGuild.setExplicitContentFilter(targetGuild.explicitContentFilter),
    });
  }

  // Notificações padrão
  if (targetGuild.defaultMessageNotifications !== undefined) {
    settingsToApply.push({
      label: 'Notificações Padrão',
      fn: () => destGuild.setDefaultMessageNotifications(targetGuild.defaultMessageNotifications),
    });
  }

  // Aplica cada configuração
  for (const setting of settingsToApply) {
    try {
      await setting.fn();
      result.applied++;
      await sleep(config.rateLimitDelay);
    } catch (error) {
      console.error(`[ERRO] Falha ao aplicar "${setting.label}":`, error.message);
      result.errors++;
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { cloneServerSettings };
