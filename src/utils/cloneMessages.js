const {
  ChannelType,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../config');

/**
 * Clona mensagens dos canais do servidor alvo para o servidor de destino.
 *
 * ATENÇÃO: Esta função requer que o bot esteja no servidor alvo,
 * que tenha permissão de leitura de mensagens em cada canal,
 * e que o servidor tenha MessageContent Intent habilitada.
 *
 * Limitações:
 *  - Máximo de 100 mensagens por canal (limite da API do Discord)
 *  - Mensagens são recriadas como webhooks para simular o autor original
 *  - Anexos são reenviados como links
 *
 * @param {string} targetServerId - ID do servidor de origem
 * @param {Guild} destGuild - Guild de destino
 * @returns {Promise<{cloned: number, errors: number}>}
 */
async function cloneMessages(targetServerId, destGuild) {
  const result = { cloned: 0, errors: 0 };

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
      `(\`${targetServerId}\`) para clonar as mensagens.\n\n` +
      'Adicione o bot ao servidor alvo e tente novamente.'
    );
  }

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
        // Canal correspondente não encontrado no destino — pula
        continue;
      }

      // Busca as últimas mensagens do canal alvo (do mais antigo ao mais recente)
      let messages;
      try {
        messages = await targetChan.messages.fetch({ limit: config.messageBatchSize });
      } catch {
        // Sem permissão de leitura — pula este canal
        continue;
      }

      // Ordena do mais antigo para o mais recente
      const sortedMessages = [...messages.values()].reverse();

      for (const msg of sortedMessages) {
        try {
          // Pula mensagens de sistema
          if (msg.system || msg.author.bot) continue;

          // Cria um webhook para simular o autor original
          const webhook = await destChan.createWebhook({
            name: msg.author.username,
            avatar: msg.author.displayAvatarURL({ size: 128 }),
            reason: 'Clona-Me — Clonagem de mensagens',
          });

          // Prepara o conteúdo
          let content = msg.content || '';

          // Adiciona links de anexos
          if (msg.attachments.size > 0) {
            const attachmentLinks = msg.attachments.map(a => a.url).join('\n');
            content = content
              ? `${content}\n\n📎 **Anexos:**\n${attachmentLinks}`
              : `📎 **Anexos:**\n${attachmentLinks}`;
          }

          // Limita o tamanho do conteúdo (Discord limita a 2000 chars)
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

          // Remove o webhook após o uso (limpeza)
          await webhook.delete('Clona-Me — Limpeza de webhook').catch(() => {});

          await sleep(config.rateLimitDelay);
        } catch (error) {
          // Erros individuais de mensagem não devem parar o processo
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
