/** Pontinhos de luz piscando no fundo (decorativo). */
const COLORS = ['var(--sun-300)', 'var(--coral-400)', 'var(--mint-300)', 'var(--sky-300)', 'var(--peach-300)'];

export function mountSparkles(root, count = 28) {
  root.innerHTML = Array.from({ length: count }, (_, i) => {
    const x = Math.random() * 100;
    const y = Math.random() * 62;
    return `<i style="left:${x}%;top:${y}%;--c:${COLORS[i % COLORS.length]};--d:${2 + Math.random() * 3}s;--delay:${-Math.random() * 4}s"></i>`;
  }).join('');
}
