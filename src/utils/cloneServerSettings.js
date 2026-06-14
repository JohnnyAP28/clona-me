const config = require('../config');

/**
 * Aplica as configurações do servidor alvo no servidor de destino.
 *
 * @param {Guild} targetGuild - Guild de origem
 * @param {Guild} destGuild - Guild de destino
 * @returns {Promise<{applied: number, errors: number}>}
 */
async function cloneServerSettings(targetGuild, destGuild) {
  const result = { applied: 0, errors: 0 };

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
