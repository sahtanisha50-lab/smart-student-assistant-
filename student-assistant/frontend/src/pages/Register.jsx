import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { register } = useAuth();

	async function handleSubmit(e) {
		if (e) e.preventDefault();
		setError('');
		if (!name.trim() || !email.trim() || !password) {
			setError('All fields are required');
			return;
		}
		if (password.length < 6) {
			setError('Password should be at least 6 characters');
			return;
		}

		setLoading(true);
		try {
			await register(name.trim(), email.trim(), password);
			navigate('/dashboard');
		} catch (e) {
			setError(e.message || 'Registration failed. Try a different email.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
			<div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-xl p-8 space-y-6">
				<div className="text-center">
					<div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">
						🚀
					</div>
					<h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
					<p className="text-sm text-gray-500 mt-1">Join Smart Student Assistant</p>
				</div>

				{error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name</label>
						<input
							type="text"
							className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Alex Mercer"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>

					<div>
						<label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
						<input
							type="email"
							className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="alex@university.edu"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>

					<div>
						<label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
						<input
							type="password"
							className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="At least 6 characters"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-md"
					>
						{loading ? 'Creating Account...' : 'Register Account'}
					</button>
				</form>

				<p className="text-center text-xs text-gray-500">
					Already have an account?{' '}
					<Link to="/login" className="text-blue-600 font-semibold hover:underline">
						Sign in here
					</Link>
				</p>
			</div>
		</div>
	);
}
