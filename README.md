# Clona-Me — Bot de Clonagem de Servidor Discord

Bot que clona a estrutura completa de um servidor do Discord (cargos, categorias, canais, permissões, configurações e mensagens) usando um modal interativo.

## Funcionalidades

- `/clone` — Abre um modal onde você escolhe o que clonar:
  - **Cargos** — Nome, cor, permissões, hierarquia
  - **Categorias e Canais** — Nome, tipo, posição, permissões, canais de voz com bitrate
  - **Configurações** — Nome, ícone, nível de verificação, filtro de conteúdo
  - **Mensagens** — Últimas 100 mensagens por canal (via webhook)

## Pré-requisitos

- **Node.js 18+**
- Conta no [Discord Developer Portal](https://discord.com/developers/applications)
- Bot criado com as intents corretas (veja abaixo)

## Intents Necessárias

No Developer Portal, em **Bot > Privileged Gateway Intents**, ative:

| Intent | Status |
|--------|--------|
| Presence Intent | ON |
| Server Members Intent | ON |
| Message Content Intent | ON |

## Configuração Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/JohnnyAP28/clona-me.git
cd clona-me

# 2. Instale as dependências
npm install

# 3. Configure o .env
cp .env.example .env
# Edite .env com seu DISCORD_TOKEN e CLIENT_ID

# 4. Registre os comandos slash
npm run deploy

# 5. Inicie o bot
npm start
```

## Como usar

1. Convide o bot para o servidor de **destino** (onde você quer que a estrutura seja copiada)
2. Convide o bot também para o servidor de **origem** (o servidor que será clonado)
3. Use `/clone` no servidor de destino
4. Preencha o modal com o ID do servidor de origem
5. Escolha o que clonar (`sim` ou `nao`)
6. Aguarde o processo terminar

> **Importante:** O bot precisa estar em **ambos** os servidores (origem e destino) para ler e copiar a estrutura. Esta é uma limitação da API do Discord.

## Como obter o ID de um servidor

1. Ative o **Modo Desenvolvedor** no Discord:
   - **Configurações > Avançado > Modo Desenvolvedor**
2. Clique com o botão direito no ícone do servidor
3. Selecione **Copiar ID do Servidor**

## Estrutura do Projeto

```
clona-me/
├── src/
│   ├── index.js              # Entrada principal
│   ├── config.js             # Configurações do bot
│   ├── deploy-commands.js    # Registro de slash commands
│   ├── commands/
│   │   └── clone.js          # Comando /clone com modal
│   ├── events/
│   │   ├── ready.js          # Evento de inicialização
│   │   └── interactionCreate.js  # Handler de interações
│   └── utils/
│       ├── cloneRoles.js     # Clonagem de cargos
│       ├── cloneChannels.js  # Clonagem de canais e categorias
│       ├── cloneServerSettings.js  # Clonagem de configurações
│       └── cloneMessages.js  # Clonagem de mensagens
├── .env.example
├── package.json
└── README.md
```

## Limitações

- **Máximo de 100 mensagens** por canal (limite da API do Discord)
- **Rate limits** — O bot insere um delay de 500ms entre operações para evitar bloqueios
- **Permissões de canal** — Mapeamento de cargos entre servidores diferentes é feito por nome, o que pode causar divergências se os cargos tiverem nomes diferentes
- **Webhooks de mensagem** — São criados e deletados durante a clonagem para simular os autores originais

## Licença

MIT
