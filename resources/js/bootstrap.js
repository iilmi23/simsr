import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Import Ziggy for route generation
import { route } from 'ziggy-js';
import { Ziggy } from './ziggy';
window.route = route;

// Suppress Chrome extension errors at bootstrap level
window.addEventListener('message', (event) => {
    // Silently ignore extension messages
    if (event.source !== window) {
        return;
    }
}, true);
