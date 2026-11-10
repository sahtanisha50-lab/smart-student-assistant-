import React, { useState, useEffect } from 'react';
import '../src/lib/toast';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Notes from './pages/Notes';
import Reminders from './pages/Reminders';
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';
import SseConnector from './components/SseConnector';
import { useAuth } from './context/AuthContext';
import { eventBus } from './lib/eventBus';

function Navigation() {
	const { user, logout } = useAuth();
	const location = useLocation();
	const [sseConnected, setSseConnected] = useState(false);

	useEffect(() => {
		const handleOpen = () => setSseConnected(true);
		const handleError = () => setSseConnected(false);
		eventBus.on('sse:open', handleOpen);
		eventBus.on('sse:error', handleError);
		return () => {
			eventBus.off('sse:open', handleOpen);
			eventBus.off('sse:error', handleError);
		};
	}, []);

	const navItems = [
		{ to: '/', label: 'Home', icon: '🏠' },
		...(user ? [{ to: '/dashboard', label: 'Dashboard', icon: '📊' }] : []),
		{ to: '/notes', label: 'Notes', icon: '📝' },
		{ to: '/reminders', label: 'Reminders', icon: '⏰' },
		{ to: '/clients', label: 'Mentors & Contacts', icon: '👥' },
		{ to: '/chat', label: 'AI Assistant', icon: '🤖' }
	];

	return (
		<nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center gap-6">
						<Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
							<span className="text-2xl">🎓</span>
							<span className="hidden sm:inline">Smart Student</span>
						</Link>
						<div className="hidden md:flex items-center space-x-1">
							{navItems.map((item) => {
								const isActive = location.pathname === item.to;
								return (
									<Link
										key={item.to}
										to={item.to}
										className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${isActive
												? 'bg-blue-50 text-blue-700 font-semibold'
												: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
											}`}
									>
										<span>{item.icon}</span>
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Real-time status dot */}
						<div
							className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200"
							title={sseConnected ? 'Real-time sync connected' : 'Connecting to real-time sync...'}
						>
							<span
								className={`inline-block w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
									}`}
							/>
							<span className="hidden sm:inline">{sseConnected ? 'Live' : 'Syncing'}</span>
						</div>

						{user ? (
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-2 pl-2">
									<div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
										{user.name ? user.name[0].toUpperCase() : 'U'}
									</div>
									<span className="text-sm font-medium text-gray-800 hidden md:inline">
										{user.name || user.email}
									</span>
								</div>
								<button
									onClick={logout}
									className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
								>
									Log Out
								</button>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Link
									to="/login"
									className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
								>
									Sign In
								</Link>
								<Link
									to="/register"
									className="px-3.5 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
								>
									Register
								</Link>
							</div>
						)}
					</div>
				</div>
			</div>
			{/* Mobile navigation row */}
			<div className="md:hidden border-t border-gray-100 px-2 py-1.5 flex justify-around bg-gray-50 text-xs overflow-x-auto">
				{navItems.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						className={`px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap ${location.pathname === item.to ? 'text-blue-600 font-bold' : 'text-gray-600'
							}`}
					>
						<span>{item.icon}</span>
						<span>{item.label}</span>
					</Link>
				))}
			</div>
		</nav>
	);
}

function App() {
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col font-sans">
			<SseConnector />
			<Navigation />
			<main className="flex-1">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/notes"
						element={
							<ProtectedRoute>
								<Notes />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/clients"
						element={
							<ProtectedRoute>
								<Clients />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/clients/:id"
						element={
							<ProtectedRoute>
								<ClientDetail />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/reminders"
						element={
							<ProtectedRoute>
								<Reminders />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/chat"
						element={
							<ProtectedRoute>
								<Chat />
							</ProtectedRoute>
						}
					/>
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
				</Routes>
			</main>
		</div>
	);
}

export default App;
