import { loadCss } from '../../common/js/load-css.js';
import { mountMuscleDetective } from './bundle.js?v=6';

export default {
  async prepare() {
    await loadCss('./muscle-detective/css/muscle-detective.css?v=6');
  },
  init(container, onBackToHub) {
    return mountMuscleDetective(container, onBackToHub);
  },
};
