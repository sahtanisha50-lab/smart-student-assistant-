import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import useAutoRefetch from '../lib/useAutoRefetch';

function computeWeekData(reminders) {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const counts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
	for (const r of reminders || []) {
		const d = new Date(r.dueAt);
		if (isNaN(d)) continue;
		const name = days[d.getDay()];
		counts[name] = (counts[name] || 0) + 1;
	}
	return [
		{ name: 'Mon', tasks: counts.Mon || 0 },
		{ name: 'Tue', tasks: counts.Tue || 0 },
		{ name: 'Wed', tasks: counts.Wed || 0 },
		{ name: 'Thu', tasks: counts.Thu || 0 },
		{ name: 'Fri', tasks: counts.Fri || 0 },
		{ name: 'Sat', tasks: counts.Sat || 0 },
		{ name: 'Sun', tasks: counts.Sun || 0 }
	];
}

export default function Dashboard() {
	const { token, user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [reminders, setReminders] = useState([]);
	const [notes, setNotes] = useState([]);
	const [clients, setClients] = useState([]);
	const [data, setData] = useState([]);
	const [error, setError] = useState('');

	async function loadAllData() {
		setLoading(true);
		setError('');
		try {
			const [remRes, noteRes, clientRes] = await Promise.all([
				apiFetch('/reminders', { token }).catch(() => ({ reminders: [] })),
				apiFetch('/notes', { token }).catch(() => ({ notes: [] })),
				apiFetch('/clients', { token }).catch(() => ({ clients: [] }))
			]);
			const remList = remRes?.reminders || [];
			setReminders(remList);
			setData(computeWeekData(remList));
			setNotes(noteRes?.notes || []);
			setClients(clientRes?.clients || clientRes || []);
		} catch (err) {
			setError(err.message || 'Failed to load dashboard overview');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (token) loadAllData();
	}, [token]);

	// Auto refetch on SSE reminder updates
	useAutoRefetch(['reminder:created', 'reminder:updated', 'reminder:deleted'], '/reminders', (res) => {
		const list = res?.reminders || [];
		setReminders(list);
		setData(computeWeekData(list));
	}, { autoFetchOnMount: false });

	// Auto refetch on SSE note updates
	useAutoRefetch(['note:created', 'note:updated', 'note:deleted'], '/notes', (res) => {
		setNotes(res?.notes || []);
	}, { autoFetchOnMount: false });

	async function toggleComplete(id, completed) {
		try {
			const res = await apiFetch(`/reminders/${id}`, {
				method: 'PUT',
				token,
				body: { completed: !completed }
			});
			setReminders(reminders.map((r) => (r._id === id ? res.reminder : r)));
			toast.success(!completed ? 'Task completed!' : 'Task reopened');
		} catch (e) {
			toast.error('Failed to update task');
		}
	}

	const now = new Date();
	const pendingReminders = reminders.filter((r) => !r.completed);
	const completedCount = reminders.filter((r) => r.completed).length;
	const overdueCount = reminders.filter((r) => !r.completed && new Date(r.dueAt) < now).length;
	const completionRate = reminders.length > 0 ? Math.round((completedCount / reminders.length) * 100) : 100;

	return (
		<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
			{/* Welcome Banner */}
			<div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-extrabold">
						Welcome back, {user?.name ? user.name.split(' ')[0] : 'Student'}! 👋
					</h1>
					<p className="mt-1 text-blue-100 text-sm sm:text-base max-w-xl">
						Here is your academic dashboard. You have <strong className="text-white underline">{pendingReminders.length} pending tasks</strong> and <strong className="text-white underline">{notes.length} saved notes</strong>.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/notes"
						className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition backdrop-blur-sm"
					>
						+ New Note
					</Link>
					<Link
						to="/reminders"
						className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-lg text-sm font-bold shadow-sm transition"
					>
						+ Add Deadline
					</Link>
				</div>
			</div>

			{/* Metric Stat Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-gray-500 uppercase">Total Notes</span>
						<span className="text-xl">📝</span>
					</div>
					<div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">{notes.length}</div>
					<Link to="/notes" className="text-xs text-blue-600 font-medium hover:underline mt-2 inline-block">
						View all notes &rarr;
					</Link>
				</div>

				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-gray-500 uppercase">Pending Tasks</span>
						<span className="text-xl">⏰</span>
					</div>
					<div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{pendingReminders.length}</div>
					<div className="text-xs text-gray-500 mt-2">
						{overdueCount > 0 ? (
							<span className="text-rose-600 font-bold">{overdueCount} overdue</span>
						) : (
							<span>All on track</span>
						)}
					</div>
				</div>

				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-gray-500 uppercase">Completed</span>
						<span className="text-xl">✅</span>
					</div>
					<div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">{completedCount}</div>
					<div className="text-xs text-gray-500 mt-2">{completionRate}% completion rate</div>
				</div>

				<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-gray-500 uppercase">Academic Contacts</span>
						<span className="text-xl">👥</span>
					</div>
					<div className="text-2xl sm:text-3xl font-extrabold text-purple-600 mt-2">{clients.length}</div>
					<Link to="/clients" className="text-xs text-blue-600 font-medium hover:underline mt-2 inline-block">
						Manage contacts &rarr;
					</Link>
				</div>
			</div>

			{/* Main Grid: Chart + Upcoming Tasks */}
			<div className="grid lg:grid-cols-3 gap-6">
				{/* Weekly Schedule Chart */}
				<div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
					<div className="flex justify-between items-center mb-4">
						<div>
							<h2 className="text-base font-bold text-gray-900">Weekly Task Distribution</h2>
							<p className="text-xs text-gray-500">Scheduled assignment deadlines across the week</p>
						</div>
						<span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
							Mon - Sun
						</span>
					</div>

					<div className="h-64">
						{loading ? (
							<div className="h-full flex items-center justify-center animate-pulse bg-gray-50 rounded-lg">
								<span className="text-sm text-gray-400">Loading chart data...</span>
							</div>
						) : error ? (
							<div className="h-full flex items-center justify-center text-center p-4">
								<p className="text-red-500 text-sm">{error}</p>
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
									<CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
									<XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
									<YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
									<Tooltip
										contentStyle={{
											backgroundColor: '#1e293b',
											color: '#fff',
											borderRadius: '8px',
											fontSize: '12px',
											border: 'none'
										}}
									/>
									<Line
										type="monotone"
										dataKey="tasks"
										stroke="#2563eb"
										strokeWidth={3}
										dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
										activeDot={{ r: 6 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>

				{/* Upcoming Deadlines Quick-List */}
				<div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex justify-between items-center mb-3">
							<h2 className="text-base font-bold text-gray-900">Upcoming Deadlines</h2>
							<Link to="/reminders" className="text-xs text-blue-600 font-medium hover:underline">
								All &rarr;
							</Link>
						</div>

						{pendingReminders.length === 0 ? (
							<div className="text-center py-10 text-gray-400 text-sm">
								<span className="text-2xl block mb-2">🎉</span>
								No pending deadlines! You are all caught up.
							</div>
						) : (
							<ul className="space-y-2.5">
								{pendingReminders.slice(0, 5).map((r) => {
									const d = new Date(r.dueAt);
									const isOverdue = d < now;
									return (
										<li
											key={r._id}
											className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition gap-2"
										>
											<div className="flex items-center gap-2.5 overflow-hidden">
												<button
													onClick={() => toggleComplete(r._id, r.completed)}
													className="w-5 h-5 rounded border border-gray-300 hover:border-emerald-500 flex items-center justify-center shrink-0 transition"
													title="Mark Done"
												>
													✓
												</button>
												<div className="overflow-hidden">
													<p className="text-xs font-semibold text-gray-800 truncate">
														{r.title}
													</p>
													<p
														className={`text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-gray-500'
															}`}
													>
														{d.toLocaleDateString(undefined, {
															month: 'short',
															day: 'numeric'
														})}{' '}
														{d.toLocaleTimeString(undefined, {
															hour: '2-digit',
															minute: '2-digit'
														})}
													</p>
												</div>
											</div>
											<span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0 font-medium capitalize">
												{r.type}
											</span>
										</li>
									);
								})}
							</ul>
						)}
					</div>

					<Link
						to="/reminders"
						className="mt-4 block text-center py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition"
					>
						Manage All Deadlines
					</Link>
				</div>
			</div>

			{/* Recent Notes + AI Study Assistant Prompts */}
			<div className="grid lg:grid-cols-2 gap-6">
				{/* Recent Notes Preview */}
				<div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
					<div className="flex justify-between items-center mb-3">
						<h2 className="text-base font-bold text-gray-900">Recent Notes</h2>
						<Link to="/notes" className="text-xs text-blue-600 font-medium hover:underline">
							View all ({notes.length}) &rarr;
						</Link>
					</div>

					{notes.length === 0 ? (
						<div className="text-center py-8 text-gray-400 text-sm">
							<span className="text-2xl block mb-2">📝</span>
							No notes yet. Create your first study summary!
						</div>
					) : (
						<div className="space-y-2.5">
							{notes.slice(0, 3).map((n) => (
								<div key={n._id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
									<h3 className="font-semibold text-xs text-gray-900">{n.title}</h3>
									{n.content && (
										<p className="text-xs text-gray-500 mt-1 line-clamp-2">
											{n.content}
										</p>
									)}
									<div className="mt-2 flex items-center gap-1.5 flex-wrap">
										{(n.tags || []).slice(0, 3).map((t) => (
											<span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
												#{t}
											</span>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* AI Study Assistant Widget */}
				<div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xl">🤖</span>
							<h2 className="text-base font-bold text-indigo-900">AI Study Copilot</h2>
						</div>
						<p className="text-xs text-indigo-700">
							Need help with an exam concept, formula explanation, or creating an active-recall study plan?
						</p>

						<div className="mt-4 space-y-2">
							<Link
								to="/chat"
								className="block p-2.5 rounded-lg bg-white border border-indigo-100 text-xs text-indigo-900 hover:bg-indigo-50 transition shadow-2xs font-medium"
							>
								💡 "How can I set up an active-recall study schedule for finals?"
							</Link>
							<Link
								to="/chat"
								className="block p-2.5 rounded-lg bg-white border border-indigo-100 text-xs text-indigo-900 hover:bg-indigo-50 transition shadow-2xs font-medium"
							>
								🧪 "Explain the difference between mitosis and meiosis simply."
							</Link>
						</div>
					</div>

					<Link
						to="/chat"
						className="mt-4 text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
					>
						Open AI Study Assistant &rarr;
					</Link>
				</div>
			</div>
		</div>
	);
}
