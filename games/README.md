# Pasta de jogos

Cada subpasta aqui é um jogo. Para adicionar o seu:

1. Copie `exemplo-quiz/` e renomeie (só letras, números, `-` e `_`).
2. Edite o `game.json`:

```json
{
  "name": "Nome do jogo",
  "description": "Uma frase sobre ele",
  "author": "Você",
  "minPlayers": 2,
  "maxPlayers": 8,
  "entry": "index.html",
  "thumbnail": "capa.png"
}
```

Só `name` é obrigatório; `entry` padrão é `index.html`.

3. Pronto. Com o servidor rodando, o jogo aparece no menu na hora
   (a pasta é observada). Pastas que começam com `_` ou `.` são ignoradas.

O jogo é servido em `/games/<pasta>/` e pode importar módulos do cliente,
por exemplo o desenho do personagem:

```js
import { drawCharacter } from '/js/character/renderer.js';
```

## Visual: obrigatório

Todo minijogo é **pixel art** e usa **só a paleta illu32** (32 cores):

- `/games/_shared/palette.js` — `PALETTE`, `PAL` (nomes), `RAMPS` (trios escuro/base/claro), `PLAYER_RAMPS` (cores dos jogadores 1–4).
- `/games/_shared/pixel.js` — desenho sem anti-aliasing num canvas pequeno (`createPixels`): bolas e barras já com contorno e 3 tons. Amplie o canvas com CSS.
- `/games/_shared/theme.css` — cores como variáveis CSS, fontes pixeladas, `.px-box` e `.px-btn`.

## Como o jogo roda

O jogo sorteado abre em tela cheia, dentro do lounge, para todo mundo.
**Não existe botão de voltar**: o lounge só volta quando o jogo termina.

### Página do jogo

```js
import { joinGame } from '/lounge/game-api.js';
const game = joinGame();
game.on('state', (data) => { /* mensagem do server.js */ });
game.send('input', { left: true });  // mensagem para o server.js
const { me } = await game.ready;     // meu id de jogador
game.end();                          // só para jogo SEM server.js
```

### Lógica no servidor (opcional)

Coloque `"server": "server.js"` no `game.json`. O arquivo roda **no PC que
hospeda a festa** e exporta uma função que recebe a partida:

```js
export default function (api) {
  api.players;                          // [{ id, name }]
  api.on('input', (playerId, data) => {}); // mensagens das páginas
  api.on('leave', (playerId) => {});      // alguém saiu no meio
  api.send(null, 'state', data);          // para todos (ou um id no lugar de null)
  api.end([idDo1º, idDo2º, ...]);         // fim: ranking dá pontos (10, 5, 3, depois 1)
}
```

Exemplo completo: `pinball/`.
