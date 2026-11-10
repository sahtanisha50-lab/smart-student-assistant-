export function ensureContainer() {
    if (typeof document === 'undefined') return null;
    let c = document.getElementById('app-toasts');
    if (!c) {
        c = document.createElement('div');
        c.id = 'app-toasts';
        c.style.position = 'fixed';
        c.style.top = '20px';
        c.style.right = '20px';
        c.style.zIndex = '9999';
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '8px';
        document.body.appendChild(c);
    }
    return c;
}

function show(message, type = 'info', timeout = 3000) {
    const c = ensureContainer();
    if (!c) {
        // fallback
        // eslint-disable-next-line no-alert
        alert(message);
        return;
    }
    const el = document.createElement('div');
    el.textContent = message;
    el.style.padding = '8px 12px';
    el.style.borderRadius = '6px';
    el.style.color = '#fff';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease, transform 200ms ease';
    el.style.transform = 'translateY(-6px)';
    if (type === 'error') el.style.background = '#ef4444';
    else if (type === 'success') el.style.background = '#16a34a';
    else el.style.background = '#111827';
    c.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => el.remove(), 200);
    }, timeout);
}

export const toast = {
    success: (msg, t) => show(msg, 'success', t),
    error: (msg, t) => show(msg, 'error', t),
    info: (msg, t) => show(msg, 'info', t)
};
