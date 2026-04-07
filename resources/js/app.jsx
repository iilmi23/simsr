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
    carline: '/carline',
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