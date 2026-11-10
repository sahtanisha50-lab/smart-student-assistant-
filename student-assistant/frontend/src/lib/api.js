import { eventBus } from './eventBus';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

async function rawFetch(url, opts = {}) {
	return fetch(url, { credentials: 'include', ...opts });
}

async function tryRefresh() {
	const res = await rawFetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
	if (!res.ok) {
		return null;
	}
	const data = await res.json().catch(() => null);
	return data;
}

async function apiFetch(path, { method = 'GET', body, token } = {}) {
	const headers = { 'Content-Type': 'application/json' };
	const access = token || localStorage.getItem('accessToken');
	if (access) headers['Authorization'] = `Bearer ${access}`;

	let res = await rawFetch(`${API_BASE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	// if unauthorized, try to refresh and retry once
	if (res.status === 401) {
		const refreshed = await tryRefresh();
		if (refreshed && refreshed.accessToken) {
			localStorage.setItem('accessToken', refreshed.accessToken);
			headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
			res = await rawFetch(`${API_BASE}${path}`, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined
			});
		} else {
			// auto-logout when refresh fails
			try { localStorage.removeItem('accessToken'); } catch (_e) {}
			window.location.href = '/login';
			throw new Error('Session expired');
		}
	}

	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message = data?.error || res.statusText || 'Request failed';
		throw new Error(message);
	}

	// emit update events for client/risk changes so UI can refresh state
	try {
		const m = (method || 'GET').toUpperCase();
		if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
			const lp = path.toLowerCase();
			if (lp.includes('/clients') || lp.includes('/risk') || lp.includes('/client')) {
				eventBus.emit('client:updated', { path, method: m, body: body || null, response: data });
			}
			// generic entity update
			eventBus.emit('entity:updated', { path, method: m, body: body || null, response: data });
		}
	} catch (_e) {}

	return data;
}

export { API_BASE, apiFetch };


