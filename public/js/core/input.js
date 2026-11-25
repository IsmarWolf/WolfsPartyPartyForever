/**
 * Camada de entrada: traduz teclado físico e controles do fliperama em
 * ações semânticas. As telas só escutam ações — nunca teclas cruas.
 *
 * Ações emitidas em 'action':
 *   { type: 'nav', dir: 'up' | 'down' | 'left' | 'right' }
 *   { type: 'char', char }    { type: 'backspace' }
 *   { type: 'confirm' }       { type: 'random' }
 *
 * 'flash' (controlId) avisa o gabinete para "afundar" a tecla na tela.
 */
import { Emitter } from './emitter.js';

const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

export class Input extends Emitter {
  locked = false;

  constructor(target = window) {
    super();
    target.addEventListener('keydown', (e) => this.#onKey(e));
  }

  /** Dispara uma ação vinda de qualquer fonte (clique, teclado, rede…). */
  dispatch(action, controlId) {
    if (controlId) this.emit('flash', controlId);
    if (this.locked) return;
    this.emit('action', action);
  }

  #onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;

    if (ARROWS[key]) {
      e.preventDefault();
      return this.dispatch({ type: 'nav', dir: ARROWS[key] }, `arrow-${ARROWS[key]}`);
    }
    if (key === 'Enter') {
      e.preventDefault();
      return this.dispatch({ type: 'confirm' }, 'btn-a');
    }
    if (key === 'Backspace') {
      e.preventDefault();
      return this.dispatch({ type: 'backspace' }, 'key-backspace');
    }
    if (key === ' ') {
      e.preventDefault();
      return this.dispatch({ type: 'char', char: ' ' }, 'key-space');
    }
    if (key.length === 1 && /[a-z0-9çãõáéíóúâêô]/i.test(key)) {
      const char = key.toUpperCase();
      return this.dispatch({ type: 'char', char }, `key-${char}`);
    }
  }
}
