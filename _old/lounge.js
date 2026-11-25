/**
 * Lounge (provisório). Por enquanto mostra quem está online e os jogos
 * encontrados na pasta /games — prova de que o registro automático funciona.
 */
import { avatarDataURL } from '../character/renderer.js';
import { connectParty, fetchGames } from '../net/party.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function mountLounge(root, profile) {
  root.hidden = false;
  root.innerHTML = `
    <div class="lounge__inner">
      <header class="lounge__head">
        <h1>LOUNGE</h1>
        <span class="lounge__soon">EM CONSTRUÇÃO</span>
      </header>
      <div class="lounge__grid">
        <section class="panel-box">
          <h2>NA FESTA</h2>
          <ul class="players" data-ui="players"></ul>
        </section>
        <section class="panel-box">
          <h2>JOGOS NA PASTA</h2>
          <ul class="games" data-ui="games"><li class="muted">procurando...</li></ul>
        </section>
      </div>
      <button class="lounge__back" type="button" data-ui="back">◀ EDITAR PERSONAGEM</button>
    </div>`;

  const playersEl = root.querySelector('[data-ui="players"]');
  const gamesEl = root.querySelector('[data-ui="games"]');
  root.querySelector('[data-ui="back"]').addEventListener('click', () => location.reload());

  const renderPlayers = (players) => {
    playersEl.innerHTML = players.map((p) => `
      <li class="player${p.self ? ' is-self' : ''}">
        <img class="pixel" src="${avatarDataURL(p, 3)}" alt="" />
        <span>${esc(p.name)}</span>
      </li>`).join('');
  };

  const renderGames = (games) => {
    gamesEl.innerHTML = games.length
      ? games.map((g) => `
          <li class="game">
            <strong>${esc(g.name)}</strong>
            <span>${esc(g.description ?? '')}</span>
            <em>${g.minPlayers}–${g.maxPlayers} JOGADORES</em>
          </li>`).join('')
      : '<li class="muted">nenhum jogo ainda — coloque um em /games</li>';
  };

  renderPlayers([{ ...profile, self: true }]);
  const games = await fetchGames();
  if (games) renderGames(games);
  else gamesEl.innerHTML = '<li class="muted">sem servidor aqui — rode <b>npm start</b> para ver os jogos</li>';

  const socket = await connectParty(profile);
  socket?.on('party:players', (list) =>
    renderPlayers(list.map((p) => ({ ...p, self: p.id === socket.id }))));
  socket?.on('games:list', renderGames);
}
