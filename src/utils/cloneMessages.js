const {
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../config');

/**
 * Clona mensagens dos canais do servidor alvo para o servidor de destino.
 *
 * @param {Guild} targetGuild - Guild de origem
 * @param {Guild} destGuild - Guild de destino
 * @returns {Promise<{cloned: number, errors: number}>}
 */
async function cloneMessages(targetGuild, destGuild) {
  const result = { cloned: 0, errors: 0 };

  // Busca todos os canais de texto do alvo
  const targetChannels = await targetGuild.channels.fetch();
  const textChannels = targetChannels.filter(
    c =>
      c.type === ChannelType.GuildText ||
      c.type === ChannelType.GuildAnnouncement
  );

  // Para cada canal alvo, encontra o canal correspondente no destino
  for (const [targetChanId, targetChan] of textChannels) {
    try {
      // Encontra o canal de destino com o mesmo nome
      const destChan = destGuild.channels.cache.find(
        c => c.name === targetChan.name &&
          (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      );

      if (!destChan) {
        continue;
      }

      let messages;
      try {
        messages = await targetChan.messages.fetch({ limit: config.messageBatchSize });
      } catch {
        continue;
      }

      const sortedMessages = [...messages.values()].reverse();

      for (const msg of sortedMessages) {
        try {
          if (msg.system || msg.author.bot) continue;

          const webhook = await destChan.createWebhook({
            name: msg.author.username,
            avatar: msg.author.displayAvatarURL({ size: 128 }),
            reason: 'Clona-Me — Clonagem de mensagens',
          });

          let content = msg.content || '';

          if (msg.attachments.size > 0) {
            const attachmentLinks = msg.attachments.map(a => a.url).join('\n');
            content = content
              ? `${content}\n\n📎 **Anexos:**\n${attachmentLinks}`
              : `📎 **Anexos:**\n${attachmentLinks}`;
          }

          if (content.length > 2000) {
            content = content.slice(0, 1997) + '...';
          }

          if (content.trim()) {
            await webhook.send({
              content: content,
              embeds: msg.embeds,
              allowedMentions: { parse: [] },
            });

            result.cloned++;
          }

          await webhook.delete('Clona-Me — Limpeza de webhook').catch(() => {});
          await sleep(config.rateLimitDelay);
        } catch (error) {
          result.errors++;
        }
      }
    } catch (error) {
      console.error(`[ERRO] Falha ao clonar mensagens do canal "${targetChan.name}":`, error.message);
      result.errors++;
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { cloneMessages };
