/** Persistência local do perfil do jogador (sobrevive a recarregar a página). */
const KEY = 'wolfsparty:profile:v1';

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* navegação privada ou armazenamento cheio: segue sem salvar */
  }
}

const SOUND_KEY = 'wolfsparty:muted';
export const loadMuted = () => {
  try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; }
};
export const saveMuted = (muted) => {
  try { localStorage.setItem(SOUND_KEY, muted ? '1' : '0'); } catch { /* ignora */ }
};
