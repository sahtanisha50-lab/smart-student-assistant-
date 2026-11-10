import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import useAutoRefetch from '../lib/useAutoRefetch';

const TYPE_CONFIG = {
	assignment: { label: 'Assignment', icon: '📚', color: 'bg-purple-100 text-purple-800 border-purple-200' },
	exam: { label: 'Exam', icon: '🎯', color: 'bg-rose-100 text-rose-800 border-rose-200' },
	project: { label: 'Project', icon: '🚀', color: 'bg-blue-100 text-blue-800 border-blue-200' },
	meeting: { label: 'Meeting', icon: '👥', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
	other: { label: 'Task', icon: '📌', color: 'bg-gray-100 text-gray-800 border-gray-200' }
};

export default function Reminders() {
	const { token } = useAuth();
	const [reminders, setReminders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Form State
	const [isEditing, setIsEditing] = useState(false);
	const [editId, setEditId] = useState(null);
	const [title, setTitle] = useState('');
	const [dueAt, setDueAt] = useState('');
	const [type, setType] = useState('assignment');
	const [notes, setNotes] = useState('');
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);

	// Filter State: 'all', 'pending', 'completed', 'overdue'
	const [filter, setFilter] = useState('all');
	const [searchQuery, setSearchQuery] = useState('');

	async function loadReminders() {
		setLoading(true);
		setError('');
		try {
			const res = await apiFetch('/reminders', { token });
			setReminders(res.reminders || []);
		} catch (e) {
			setError(e.message || 'Failed to load reminders');
		} finally {
			setLoading(false);
		}
	}

	// Auto refetch on SSE reminder updates
	useAutoRefetch(['reminder:created', 'reminder:updated', 'reminder:deleted'], '/reminders', (res) => {
		setReminders(res?.reminders || []);
		setLoading(false);
	}, { autoFetchOnMount: false, setError });

	useEffect(() => {
		if (token) loadReminders();
	}, [token]);

	function resetForm() {
		setTitle('');
		setDueAt('');
		setType('assignment');
		setNotes('');
		setIsEditing(false);
		setEditId(null);
		setFormError('');
	}

	function startEdit(r) {
		setIsEditing(true);
		setEditId(r._id);
		setTitle(r.title);
		setType(r.type || 'assignment');
		setNotes(r.notes || '');

		// Format date for datetime-local input (YYYY-MM-DDTHH:MM)
		try {
			const d = new Date(r.dueAt);
			const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
				.toISOString()
				.slice(0, 16);
			setDueAt(formatted);
		} catch (_e) {
			setDueAt('');
		}
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function handleSubmit(e) {
		if (e) e.preventDefault();
		setFormError('');
		if (!title.trim()) {
			setFormError('Title is required');
			return;
		}
		if (!dueAt || Number.isNaN(Date.parse(dueAt))) {
			setFormError('A valid due date and time is required');
			return;
		}

		setSaving(true);
		try {
			const isoDueAt = new Date(dueAt).toISOString();
			if (isEditing && editId) {
				const res = await apiFetch(`/reminders/${editId}`, {
					method: 'PUT',
					token,
					body: { title: title.trim(), dueAt: isoDueAt, type, notes: notes.trim() }
				});
				setReminders(reminders.map((r) => (r._id === editId ? res.reminder : r)));
				toast.success('Reminder updated successfully!');
			} else {
				const res = await apiFetch('/reminders', {
					method: 'POST',
					token,
					body: { title: title.trim(), dueAt: isoDueAt, type, notes: notes.trim() }
				});
				setReminders([...reminders, res.reminder]);
				toast.success('Reminder scheduled!');
			}
			resetForm();
		} catch (err) {
			setFormError(err.message || 'Failed to save reminder');
			toast.error(err.message || 'Failed to save reminder');
		} finally {
			setSaving(false);
		}
	}

	async function toggleComplete(id, completed) {
		try {
			const res = await apiFetch(`/reminders/${id}`, {
				method: 'PUT',
				token,
				body: { completed: !completed }
			});
			setReminders(reminders.map((r) => (r._id === id ? res.reminder : r)));
			toast.success(!completed ? '🎉 Task completed!' : 'Task marked pending');
		} catch (e) {
			toast.error(e.message || 'Failed to update reminder');
		}
	}

	async function removeReminder(id) {
		if (!window.confirm('Delete this reminder?')) return;
		try {
			await apiFetch(`/reminders/${id}`, { method: 'DELETE', token });
			setReminders(reminders.filter((r) => r._id !== id));
			toast.success('Reminder removed');
			if (editId === id) resetForm();
		} catch (e) {
			toast.error(e.message || 'Failed to delete reminder');
		}
	}

	const now = new Date();

	// Filtering
	const filteredReminders = reminders.filter((r) => {
		const isCompleted = Boolean(r.completed);
		const due = new Date(r.dueAt);
		const isOverdue = !isCompleted && due < now;

		if (filter === 'pending' && isCompleted) return false;
		if (filter === 'completed' && !isCompleted) return false;
		if (filter === 'overdue' && !isOverdue) return false;

		const q = searchQuery.toLowerCase();
		if (q) {
			const matchTitle = r.title.toLowerCase().includes(q);
			const matchNotes = (r.notes || '').toLowerCase().includes(q);
			const matchType = (r.type || '').toLowerCase().includes(q);
			if (!matchTitle && !matchNotes && !matchType) return false;
		}
		return true;
	});

	// Quick stats
	const pendingCount = reminders.filter((r) => !r.completed).length;
	const completedCount = reminders.filter((r) => r.completed).length;
	const overdueCount = reminders.filter((r) => !r.completed && new Date(r.dueAt) < now).length;

	return (
		<div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<span>⏰</span> Deadlines & Reminders
					</h1>
					<p className="text-gray-600 text-sm mt-1">
						Track homework assignments, exams, and project milestones.
					</p>
				</div>
				<div className="flex gap-2">
					<span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg text-xs font-semibold">
						{pendingCount} Pending
					</span>
					{overdueCount > 0 && (
						<span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-lg text-xs font-semibold animate-pulse">
							{overdueCount} Overdue
						</span>
					)}
					<span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-semibold">
						{completedCount} Done
					</span>
				</div>
			</div>

			{/* Add / Edit Reminder Card */}
			<div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
				<h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
					<span>{isEditing ? '✏️ Edit Reminder' : '➕ Add New Deadline / Reminder'}</span>
					{isEditing && (
						<button
							onClick={resetForm}
							className="text-xs text-gray-500 hover:text-gray-800 underline"
						>
							Cancel Edit
						</button>
					)}
				</h2>

				<form onSubmit={handleSubmit} className="space-y-3">
					{formError && (
						<div className="p-2.5 rounded bg-red-50 text-red-700 text-sm border border-red-200">
							{formError}
						</div>
					)}

					<div className="grid sm:grid-cols-3 gap-3">
						<div className="sm:col-span-2">
							<input
								type="text"
								className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Task or Assignment Title (e.g. Physics Midterm Exam)"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</div>
						<div>
							<select
								className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
								value={type}
								onChange={(e) => setType(e.target.value)}
							>
								<option value="assignment">📚 Assignment</option>
								<option value="exam">🎯 Exam / Quiz</option>
								<option value="project">🚀 Project Milestone</option>
								<option value="meeting">👥 Study Session / Meeting</option>
								<option value="other">📌 Other Task</option>
							</select>
						</div>
					</div>

					<div className="grid sm:grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-medium text-gray-600 mb-1">Due Date & Time</label>
							<input
								type="datetime-local"
								className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
								value={dueAt}
								onChange={(e) => setDueAt(e.target.value)}
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-600 mb-1">Notes / Instructions (optional)</label>
							<input
								type="text"
								className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Chapters 1-3, calculator allowed, etc."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						{isEditing && (
							<button
								type="button"
								onClick={resetForm}
								className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
							>
								Cancel
							</button>
						)}
						<button
							type="submit"
							disabled={saving}
							className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50"
						>
							{saving ? 'Saving...' : isEditing ? 'Update Reminder' : 'Add Reminder'}
						</button>
					</div>
				</form>
			</div>

			{/* Filter & Search Bar */}
			<div className="mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
					{[
						{ id: 'all', label: 'All Tasks', count: reminders.length },
						{ id: 'pending', label: 'Pending', count: pendingCount },
						{ id: 'overdue', label: 'Overdue', count: overdueCount },
						{ id: 'completed', label: 'Completed', count: completedCount }
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setFilter(tab.id)}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${filter === tab.id
									? 'bg-blue-600 text-white shadow-sm'
									: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
								}`}
						>
							<span>{tab.label}</span>
							<span
								className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === tab.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
									}`}
							>
								{tab.count}
							</span>
						</button>
					))}
				</div>

				<div className="relative w-full sm:w-64">
					<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
						🔍
					</span>
					<input
						type="text"
						className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Search deadlines..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			{/* Reminders List */}
			<div className="mt-6">
				{loading ? (
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="border border-gray-200 rounded-xl p-4 bg-white animate-pulse flex justify-between items-center">
								<div className="space-y-2 w-1/2">
									<div className="h-5 bg-gray-200 rounded" />
									<div className="h-3 bg-gray-100 rounded w-1/3" />
								</div>
								<div className="h-8 bg-gray-100 rounded w-20" />
							</div>
						))}
					</div>
				) : error ? (
					<div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-6">
						<p className="text-red-600 mb-4 font-medium">{error}</p>
						<button
							onClick={loadReminders}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
						>
							Try Again
						</button>
					</div>
				) : filteredReminders.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-6">
						<div className="text-4xl mb-3">⏰</div>
						<h3 className="text-base font-semibold text-gray-800">No deadlines in this view</h3>
						<p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
							{searchQuery
								? 'No reminders match your search.'
								: filter === 'overdue'
									? 'Awesome! You have zero overdue assignments.'
									: 'Add your first upcoming test or deadline using the form above.'}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filteredReminders.map((r) => {
							const typeInfo = TYPE_CONFIG[r.type] || TYPE_CONFIG.other;
							const d = new Date(r.dueAt);
							const isOverdue = !r.completed && d < now;
							const isDueToday =
								!r.completed &&
								d.toDateString() === now.toDateString();

							return (
								<div
									key={r._id}
									className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${r.completed
											? 'border-gray-200 bg-gray-50 opacity-75'
											: isOverdue
												? 'border-rose-300 bg-rose-50/30'
												: isDueToday
													? 'border-amber-300 bg-amber-50/20'
													: 'border-gray-200'
										}`}
								>
									<div className="flex items-start gap-3">
										<button
											onClick={() => toggleComplete(r._id, r.completed)}
											className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${r.completed
													? 'bg-emerald-600 border-emerald-600 text-white'
													: 'border-gray-300 hover:border-emerald-500 text-transparent'
												}`}
											title={r.completed ? 'Mark incomplete' : 'Mark completed'}
										>
											✓
										</button>
										<div>
											<div className="flex items-center gap-2 flex-wrap">
												<span
													className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${typeInfo.color}`}
												>
													<span>{typeInfo.icon}</span>
													<span>{typeInfo.label}</span>
												</span>
												<h3
													className={`font-semibold text-gray-900 text-base ${r.completed ? 'line-through text-gray-500' : ''
														}`}
												>
													{r.title}
												</h3>
											</div>

											{r.notes && (
												<p className="text-gray-600 text-xs mt-1">
													{r.notes}
												</p>
											)}

											<div className="flex items-center gap-2 mt-2 text-xs">
												<span
													className={`font-medium ${r.completed
															? 'text-gray-400'
															: isOverdue
																? 'text-rose-600 font-bold'
																: isDueToday
																	? 'text-amber-600 font-bold'
																	: 'text-gray-500'
														}`}
												>
													{isOverdue && '⚠️ Overdue: '}
													{isDueToday && '⚡ Due Today: '}
													{!isOverdue && !isDueToday && '📅 Due: '}
													{d.toLocaleDateString(undefined, {
														weekday: 'short',
														month: 'short',
														day: 'numeric'
													})}{' '}
													at{' '}
													{d.toLocaleTimeString(undefined, {
														hour: '2-digit',
														minute: '2-digit'
													})}
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2 sm:self-center pl-9 sm:pl-0">
										<button
											onClick={() => startEdit(r)}
											className="px-2.5 py-1 text-xs text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg transition"
										>
											✏️ Edit
										</button>
										<button
											onClick={() => removeReminder(r._id)}
											className="px-2.5 py-1 text-xs text-gray-600 hover:text-rose-600 bg-gray-100 hover:bg-rose-50 rounded-lg transition"
										>
											🗑️ Delete
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
