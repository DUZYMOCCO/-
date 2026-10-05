/**
 * スマホゲーム工房 ローカルストレージ管理
 */
const STORAGE_PREFIX = 'game_studio_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(STORAGE_PREFIX + key);
      return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
      console.warn('Storage get error:', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage set error:', e);
      return false;
    }
  },

  getHighScore(gameId) {
    return this.get(`highscore_${gameId}`, 0);
  },

  setHighScore(gameId, score) {
    const current = this.getHighScore(gameId);
    if (score > current) {
      this.set(`highscore_${gameId}`, score);
      return true; // 新記録
    }
    return false;
  },

  getSoundMuted() {
    return this.get('sound_muted', false);
  },

  setSoundMuted(muted) {
    this.set('sound_muted', muted);
  }
};
