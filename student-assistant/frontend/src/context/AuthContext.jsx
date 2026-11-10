import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

// Auth now uses short-lived access tokens + http-only refresh cookie

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [token, setToken] = useState(() => localStorage.getItem('accessToken') || '');
	const [user, setUser] = useState(() => {
		const raw = localStorage.getItem('user');
		try { return raw ? JSON.parse(raw) : null; } catch { return null; }
	});

	useEffect(() => {
		if (token) localStorage.setItem('accessToken', token); else localStorage.removeItem('accessToken');
		if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
	}, [token, user]);

	async function login(email, password) {
		const res = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
		// backend returns { accessToken, user } and sets refresh cookie
		setToken(res.accessToken);
		setUser(res.user);
		return res;
	}

	async function register(name, email, password) {
		const res = await apiFetch('/auth/register', { method: 'POST', body: { name, email, password } });
		setToken(res.accessToken);
		setUser(res.user);
		return res;
	}

	async function logout() {
		try {
			await apiFetch('/auth/logout', { method: 'POST' });
		} catch (_e) {
			// ignore
		}
		setToken('');
		setUser(null);
	}

	const value = useMemo(() => ({ token, user, login, register, logout }), [token, user]);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	return useContext(AuthContext);
}


