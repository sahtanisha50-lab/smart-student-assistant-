import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
	const { token } = useAuth();
	if (!token) {
		try { localStorage.setItem('lastPath', window.location.pathname); } catch (_e) {}
		return <Navigate to="/login" replace />;
	}
	return children;
}


