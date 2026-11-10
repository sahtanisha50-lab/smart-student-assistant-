import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function Home() {
	const { user, login } = useAuth();

	async function handleDemoLogin() {
		try {
			await login('student@test.edu', 'Password123!');
		} catch (e) {
			// If not yet registered, try registering
			try {
				await apiFetch('/auth/register', {
					method: 'POST',
					body: { name: 'Demo Student', email: 'student@test.edu', password: 'Password123!' }
				});
				await login('student@test.edu', 'Password123!');
			} catch (_err) {
				window.location.href = '/login';
			}
		}
	}

	return (
		<div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-blue-50 via-white to-gray-50 pb-16">
			{/* Hero Section */}
			<div className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
					<span>✨</span> Powered by Real-Time Sync & AI Assistance
				</div>
				<h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
					Your Intelligent <span className="text-blue-600">Student Study Assistant</span>
				</h1>
				<p className="mt-4 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
					Centralize your study notes, stay ahead of assignment deadlines, analyze study workload, and get instant answers from your AI study copilot.
				</p>

				<div className="mt-8 flex flex-wrap justify-center gap-4">
					{user ? (
						<>
							<Link
								to="/dashboard"
								className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition flex items-center gap-2"
							>
								<span>📊</span> Open Dashboard
							</Link>
							<Link
								to="/chat"
								className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition flex items-center gap-2"
							>
								<span>🤖</span> Chat with AI
							</Link>
						</>
					) : (
						<>
							<Link
								to="/register"
								className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition flex items-center gap-2"
							>
								<span>🚀</span> Get Started Free
							</Link>
							<Link
								to="/login"
								className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
							>
								<span>🔑</span> Sign In
							</Link>
							<button
								onClick={handleDemoLogin}
								className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 transition flex items-center gap-2"
							>
								<span>⚡</span> Try Demo Account
							</button>
						</>
					)}
				</div>
			</div>

			{/* Interactive Features Grid */}
			<div className="max-w-6xl mx-auto px-4 mt-8">
				<h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
					Everything You Need to Ace Your Semester
				</h2>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
						<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl mb-4">
							📝
						</div>
						<h3 className="font-bold text-gray-900 text-lg mb-2">Smart Notes</h3>
						<p className="text-gray-600 text-sm">
							Organize class lecture notes, tags, and rich content. Search and filter instantly as you type.
						</p>
						<Link to="/notes" className="inline-block mt-4 text-blue-600 font-medium text-sm hover:underline">
							Explore Notes &rarr;
						</Link>
					</div>

					<div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
						<div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl mb-4">
							⏰
						</div>
						<h3 className="font-bold text-gray-900 text-lg mb-2">Deadline Tracker</h3>
						<p className="text-gray-600 text-sm">
							Never miss an assignment or exam. View countdowns, mark tasks completed, and visualize your week.
						</p>
						<Link to="/reminders" className="inline-block mt-4 text-blue-600 font-medium text-sm hover:underline">
							View Reminders &rarr;
						</Link>
					</div>

					<div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
						<div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl mb-4">
							🤖
						</div>
						<h3 className="font-bold text-gray-900 text-lg mb-2">AI Study Copilot</h3>
						<p className="text-gray-600 text-sm">
							Generate exam prep guides, explain tough concepts simply, and create Pomodoro study schedules.
						</p>
						<Link to="/chat" className="inline-block mt-4 text-blue-600 font-medium text-sm hover:underline">
							Ask AI Copilot &rarr;
						</Link>
					</div>

					<div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
						<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl mb-4">
							👥
						</div>
						<h3 className="font-bold text-gray-900 text-lg mb-2">Mentors & Contacts</h3>
						<p className="text-gray-600 text-sm">
							Keep contacts for professors, TAs, study group partners, and track subject risk or performance scores.
						</p>
						<Link to="/clients" className="inline-block mt-4 text-blue-600 font-medium text-sm hover:underline">
							Manage Contacts &rarr;
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
