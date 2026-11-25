/**
 * Mantém um palco de tamanho lógico fixo (W×H) sempre inteiro na tela,
 * centralizado e escalado — por isso a página nunca precisa rolar.
 */
export class Viewport {
  constructor(el, { width, height, margin = 0.96 }) {
    this.el = el;
    this.width = width;
    this.height = height;
    this.margin = margin;
    this.frozen = false;
    this.fit = this.fit.bind(this);
    window.addEventListener('resize', this.fit);
    this.fit();
  }

  fit() {
    if (this.frozen) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.scale = Math.min((vw * this.margin) / this.width, (vh * this.margin) / this.height);
    this.left = (vw - this.width * this.scale) / 2;
    this.top = (vh - this.height * this.scale) / 2;
    const t = `translate(${this.left}px, ${this.top}px) scale(${this.scale})`;
    this.el.style.transform = t;
    this.el.style.setProperty('--rig-transform', t);
  }

  /**
   * Zoom até que o retângulo `rect` (em coordenadas do palco) cubra a tela.
   * Retorna uma Promise resolvida no fim da transição.
   */
  zoomTo(rect, { duration = 900 } = {}) {
    this.frozen = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = Math.max(vw / rect.width, vh / rect.height) * 1.04;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const tx = vw / 2 - cx * s;
    const ty = vh / 2 - cy * s;
    this.el.style.transition = `transform ${duration}ms cubic-bezier(.7,0,.25,1)`;
    this.el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    return new Promise((r) => setTimeout(r, duration));
  }
}
