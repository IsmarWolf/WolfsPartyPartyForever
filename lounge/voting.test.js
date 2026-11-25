// node lounge/voting.test.js — confere o sorteio ponderado
import assert from 'node:assert';
import { pickWinner } from './voting.js';

const games = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

// ninguém votou: todos os jogos concorrem com a mesma chance
let r = pickWinner(new Map(), games, () => 0.99);
assert.deepEqual(r.candidates, ['a', 'b', 'c']);
assert.deepEqual(r.weights, [1, 1, 1]);
assert.equal(r.winner, 'c');

// todos no mesmo jogo: só ele concorre
r = pickWinner(new Map([['p1', 'b'], ['p2', 'b']]), games);
assert.deepEqual(r.candidates, ['b']);
assert.equal(r.winner, 'b');

// 2 votos em a, 1 em c: a tem 2/3, c tem 1/3 (e ainda pode sair)
const v = new Map([['p1', 'a'], ['p2', 'a'], ['p3', 'c']]);
assert.deepEqual(pickWinner(v, games).weights, [2, 1]);
assert.equal(pickWinner(v, games, () => 0.6).winner, 'a');
assert.equal(pickWinner(v, games, () => 0.7).winner, 'c');
let c = 0;
for (let i = 0; i < 30000; i++) if (pickWinner(v, games).winner === 'c') c++;
assert.ok(Math.abs(c / 30000 - 1 / 3) < 0.02, `c saiu ${c / 300}%`);

console.log('voting ok');
