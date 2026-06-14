module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[ON] ${client.user.tag} está online e pronto para clonar!`);
    console.log(`[ON] Presente em ${client.guilds.cache.size} servidor(es).`);

    client.user.setPresence({
      activities: [{ name: '/venda para criar produtos', type: 2 }],
      status: 'online',
    });
  },
};
