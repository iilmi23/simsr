import '../css/app.css';
import './bootstrap';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'SIMSR';

createInertiaApp({
    title: (title) => title,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <App {...props} />
        );
    },
    progress: {
        color: '#1D6F42',
    },
});

// Suppress browser extension message passing errors (non-critical)
// These errors are common when Chrome extensions try to communicate with pages
const isExtensionError = (message = '') => {
    const msg = String(message).toLowerCase();
    return msg.includes('message channel closed') || 
           msg.includes('asynchronous response') ||
           msg.includes('a listener indicated') ||
           msg.includes('extension context invalidated') ||
           msg.includes('the page you are on') ||
           msg.includes('chrome-extension://');
};

// Handle synchronous errors
window.addEventListener('error', (event) => {
    if (isExtensionError(event.message)) {
        event.preventDefault();
        return true;
    }
}, true); // Use capture phase to catch early

// Handle promise rejections
window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || reason?.toString() || '';
    
    if (isExtensionError(message)) {
        event.preventDefault();
    }
}, true); // Use capture phase

// Override Chrome extension message handler
if (typeof window !== 'undefined' && window.chrome?.runtime) {
    try {
        // Listen for messages and always respond
        if (window.chrome.runtime.onMessage) {
            window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                try {
                    sendResponse({ received: true });
                } catch (err) {
                    // Ignore if port is already closed
                }
                // Returning true indicates you want to send a response asynchronously
                // But we already sent it synchronously, so return false
                return false;
            });
        }
    } catch (e) {
        // Ignore initialization errors
    }
}

const ROUTES = {
    'sanctum.csrf-cookie': '/sanctum/csrf-cookie',
    dashboard: '/dashboard',
    shipments: '/shipments',
    'customers.index': '/customers',
    'customers.create': '/customers/create',
    'customers.store': '/customers',
    'customers.show': '/customers/{customer}',
    'customers.edit': '/customers/{customer}/edit',
    'customers.update': '/customers/{customer}',
    'customers.destroy': '/customers/{customer}',
    'customers.ports.index': '/customers/{customer}/ports',
    'customers.ports.create': '/customers/{customer}/ports/create',
    'customers.ports.store': '/customers/{customer}/ports',
    'customers.ports.show': '/customers/{customer}/ports/{port}',
    'customers.ports.edit': '/customers/{customer}/ports/{port}/edit',
    'customers.ports.update': '/customers/{customer}/ports/{port}',
    'customers.ports.destroy': '/customers/{customer}/ports/{port}',
    'ports.index': '/ports',
    'carline.index': '/carline',
    'carline.importPage': '/carline/import',
    'carline.getSheets': '/carline/get-sheets',
    'carline.previewSheet': '/carline/preview-sheet',
    'carline.import': '/carline/import',
    'carline.create': '/carline/create',
    'carline.store': '/carline',
    'carline.show': '/carline/{carline}',
    'carline.edit': '/carline/{carline}/edit',
    'carline.update': '/carline/{carline}',
    'carline.destroy': '/carline/{carline}',

    'timechart.index': '/timechart',

    'production-week.index': '/production-week',
    'production-week.create': '/production-week/create',
    'production-week.store': '/production-week',
    'production-week.show': '/production-week/{week}',
    'production-week.edit': '/production-week/{week}/edit',
    'production-week.update': '/production-week/{week}',
    'production-week.destroy': '/production-week/{week}',

    'assy.index': '/assy',
    'assy.importPage': '/assy/import',
    'assy.create': '/assy/create',
    'assy.store': '/assy',
    'assy.show': '/assy/{assy}',
    'assy.edit': '/assy/{assy}/edit',
    'assy.update': '/assy/{assy}',
    'assy.destroy': '/assy/{assy}',
    'assy.upload': '/assy/upload',
    'assy.toggle-status': '/assy/{assy}/toggle-status',
    'assy.download-template': '/assy/download-template/{carline_id}',
    'assy.download': '/assy/download/{assy}',
    'assy.getSheets': '/assy/get-sheets',
    'assy.previewSheet': '/assy/preview-sheet',
    'assy.import': '/assy/import-data',


    'sr.upload.page': '/sr/upload',
    'sr.preview': '/preview',
    'sr.upload': '/sr/upload',
    'summary.index': '/summary',
    'summary.exportAll': '/summary/export',
    'summary.show': '/summary/{id}',
    'summary.data': '/summary/{id}/data',
    'summary.export': '/summary/{id}/export',
    'summary.destroy': '/summary/{id}',
    spp: '/spp',
    'spp.show': '/spp/{period}',
    history: '/history',
    settings: '/settings',
    'debug.logs': '/debug/logs',
    'profile.edit': '/profile',
    'profile.update': '/profile',
    'profile.destroy': '/profile',
    register: '/register',
    login: '/login',
    'password.request': '/forgot-password',
    'password.email': '/forgot-password',
    'password.reset': '/reset-password/{token}',
    'password.store': '/reset-password',
    'verification.notice': '/verify-email',
    'verification.verify': '/verify-email/{id}/{hash}',
    'verification.send': '/email/verification-notification',
    'password.confirm': '/confirm-password',
    'password.update': '/password',
    logout: '/logout',
    'users.index': '/admin/users',
    'users.create': '/admin/users/create',
    'users.store': '/admin/users',
    'users.show': '/admin/users/{user}',
    'users.edit': '/admin/users/{user}/edit',
    'users.update': '/admin/users/{user}',
    'users.destroy': '/admin/users/{user}',
};

const routeHelper = (name, params = {}, absolute = false) => {
    if (!name) {
        return routeHelper;
    }

    const uri = ROUTES[name];
    if (!uri) {
        throw new Error(`Route "${name}" is not defined.`);
    }

    let url = uri;

    if (typeof params === 'string' || typeof params === 'number') {
        const placeholder = url.match(/{([^}]+)}/);
        if (placeholder) {
            url = url.replace(`{${placeholder[1]}}`, encodeURIComponent(params));
        }
    } else if (Array.isArray(params)) {
        let index = 0;
        url = url.replace(/{([^}]+)}/g, (_, key) => {
            const value = params[index++];
            if (value === undefined) {
                throw new Error(`Missing route parameter "${key}" for route "${name}".`);
            }
            return encodeURIComponent(value);
        });
    } else {
        url = url.replace(/{([^}]+)}/g, (_, key) => {
            if (params[key] === undefined) {
                throw new Error(`Missing route parameter "${key}" for route "${name}".`);
            }
            return encodeURIComponent(params[key]);
        });
    }

    if (absolute) {
        return `${window.location.origin}${url}`;
    }

    return url;
};

routeHelper.current = (name) => {
    if (!name) {
        return false;
    }

    const currentPath = window.location.pathname;
    const targetPath = routeHelper(name);
    return currentPath === targetPath;
};

if (typeof window !== 'undefined') {
    window.route = routeHelper;
}