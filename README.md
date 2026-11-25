# 🐺 Wolf's Party

Suíte de party games multiplayer, feita para ser modular: **coloque um jogo
na pasta `games/` e ele aparece no menu.** Sem código de sala — todo mundo
que abre o link do túnel entra na mesma festa.

## Rodando

```bash
npm install
npm start          # http://localhost:3000
npm run tunnel     # gera um link público (precisa do cloudflared instalado)
```

Instalar o cloudflared no Windows: `winget install --id Cloudflare.cloudflared`

`npm run dev` reinicia o servidor sozinho quando você edita arquivos do `server/`.

## Estrutura

```
server/
  index.js          servidor HTTP + socket.io
  gameRegistry.js   lê games/*/game.json e observa a pasta
  partyHub.js       presença dos jogadores em tempo real
public/
  index.html        palco único (a página nunca rola)
  css/
    tokens.css      TODAS as cores, fontes e medidas
    base.css        reset + cena de fundo
    cabinet.css     o fliperama (letreiro, tela, painel, alavanca)
    creator.css     tela de criação de personagem
    lounge.css      lounge (provisório)
  js/
    main.js         só conecta os módulos
    core/           emitter, input (teclado → ações), audio, viewport, storage
    character/      palettes, parts (desenhos), model (estado), renderer
    ui/             cabinet, creatorScreen, randomizer, sparkles
    views/          lounge
    net/            cliente da festa (socket.io)
  tools/sprites.html  catálogo de todas as partes — use ao desenhar partes novas
games/
  exemplo-quiz/     jogo modelo
```

## Estúdio do gabinete

Abra `/tools/cabinet-studio.html` (ou o botão **GABINETE** no canto da sala)
para desenhar a carcaça do fliperama em pixel art (320×250; cada pixel vira
4×4 no jogo).

- Camadas: **CORPO** (atrás de tudo), **NEON** (ganha brilho no jogo) e
  **FRENTE** (fica por cima dos controles).
- **Espelho** (M) desenha os dois lados ao mesmo tempo.
- **Referência**: abra uma imagem por baixo para copiar por cima.
- **Peças** (V): arraste tela, letreiro, joystick, teclado, botões, alavanca e
  som para onde quiser.
- **SALVAR NO JOGO** grava em `public/cabinet/cabinet.json` (só pelo próprio
  PC, com `npm start`). Quem entra pelo túnel não consegue alterar.
- `?gabinete=padrao` na URL do jogo ignora o desenho salvo.

## Personagens

Todas as partes são desenhadas como texto em `public/js/character/parts.js`
(uma letra por pixel). O contorno escuro é gerado sozinho. Para uma parte
nova, copie uma existente, edite e confira em `/tools/sprites.html`.
Cores novas vão em `palettes.js`. O menu e o botão aleatório pegam tudo
automaticamente.

## Controles

| Ação | Teclado | Fliperama |
|---|---|---|
| Escolher linha | ↑ ↓ | setas |
| Trocar opção | ← → | setas / clicar nas setinhas da tela |
| Nome | digitar | teclado do painel |
| Apagar | Backspace | ⌫ ou botão B |
| Aleatório | — | alavanca ou botão ALEATÓRIO |
| Pronto | Enter | botão A ou PRONTO |
