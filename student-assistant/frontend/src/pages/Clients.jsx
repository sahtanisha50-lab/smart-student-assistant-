import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import useAutoRefetch from '../lib/useAutoRefetch';

export default function Clients() {
	const { token } = useAuth();
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Add Contact Modal / Form State
	const [showAddForm, setShowAddForm] = useState(false);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [role, setRole] = useState('Professor');
	const [riskScore, setRiskScore] = useState(50);
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');

	// Search State
	const [searchQuery, setSearchQuery] = useState('');

	async function loadClients() {
		setLoading(true);
		setError('');
		try {
			const res = await apiFetch('/clients', { token });
			setClients(res.clients || res || []);
		} catch (err) {
			setError(err.message || 'Failed to load contacts');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (token) loadClients();
	}, [token]);

	// Auto refetch on SSE client updates
	useAutoRefetch(['client:created', 'client:updated', 'client:deleted'], '/clients', (res) => {
		setClients(res?.clients || res || []);
		setLoading(false);
	}, { autoFetchOnMount: false, setError });

	function resetForm() {
		setName('');
		setEmail('');
		setRole('Professor');
		setRiskScore(50);
		setNotes('');
		setFormError('');
		setShowAddForm(false);
	}

	async function handleAddContact(e) {
		e.preventDefault();
		setFormError('');
		if (!name.trim()) {
			setFormError('Contact name is required');
			return;
		}

		setSaving(true);
		try {
			const res = await apiFetch('/clients', {
				method: 'POST',
				token,
				body: {
					name: name.trim(),
					email: email.trim() || undefined,
					riskScore: Number(riskScore),
					meta: { role, notes: notes.trim() }
				}
			});
			setClients([res.client, ...clients]);
			toast.success('Contact added successfully!');
			resetForm();
		} catch (err) {
			setFormError(err.message || 'Failed to add contact');
			toast.error(err.message || 'Failed to add contact');
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteContact(id, e) {
		e.preventDefault();
		e.stopPropagation();
		if (!window.confirm('Delete this contact?')) return;
		try {
			await apiFetch(`/clients/${id}`, { method: 'DELETE', token });
			setClients(clients.filter((c) => (c._id || c.id) !== id));
			toast.success('Contact deleted');
		} catch (err) {
			toast.error(err.message || 'Failed to delete contact');
		}
	}

	const filteredContacts = clients.filter((c) => {
		const q = searchQuery.toLowerCase();
		if (!q) return true;
		const nameMatch = (c.name || '').toLowerCase().includes(q);
		const emailMatch = (c.email || '').toLowerCase().includes(q);
		const roleMatch = (c.meta?.role || '').toLowerCase().includes(q);
		return nameMatch || emailMatch || roleMatch;
	});

	return (
		<div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<span>👥</span> Mentors & Academic Contacts
					</h1>
					<p className="text-gray-600 text-sm mt-1">
						Keep directory of your professors, advisors, study group peers, and course mentors.
					</p>
				</div>
				<button
					onClick={() => setShowAddForm(!showAddForm)}
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition flex items-center gap-2"
				>
					<span>{showAddForm ? '✕ Close' : '➕ Add Contact'}</span>
				</button>
			</div>

			{/* Add Contact Form Card */}
			{showAddForm && (
				<div className="mt-6 bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
					<h2 className="text-base font-semibold text-gray-800 mb-3">
						Add Professor, Mentor, or Study Partner
					</h2>

					<form onSubmit={handleAddContact} className="space-y-3">
						{formError && (
							<div className="p-2.5 rounded bg-red-50 text-red-700 text-sm border border-red-200">
								{formError}
							</div>
						)}

						<div className="grid sm:grid-cols-3 gap-3">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
								<input
									type="text"
									className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Dr. Eleanor Vance"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
								<input
									type="email"
									className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="professor@university.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Role / Affiliation</label>
								<select
									className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
									value={role}
									onChange={(e) => setRole(e.target.value)}
								>
									<option value="Professor">🎓 Professor</option>
									<option value="Teaching Assistant (TA)">📚 Teaching Assistant (TA)</option>
									<option value="Academic Advisor">🧭 Academic Advisor</option>
									<option value="Study Group Partner">🤝 Study Group Partner</option>
									<option value="Tutor">✏️ Tutor / Mentor</option>
								</select>
							</div>
						</div>

						<div className="grid sm:grid-cols-2 gap-3">
							<div>
								<div className="flex justify-between items-center mb-1">
									<label className="text-xs font-medium text-gray-600">Course Risk / Urgency Score</label>
									<span className="text-xs font-bold text-blue-600">{riskScore}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="100"
									className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
									value={riskScore}
									onChange={(e) => setRiskScore(e.target.value)}
								/>
								<div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
									<span>Low Attention (0)</span>
									<span>High Priority (100)</span>
								</div>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Office Hours / Notes</label>
								<input
									type="text"
									className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Tues/Thurs 2-4pm, Room 302"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
								/>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={resetForm}
								className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50"
							>
								{saving ? 'Saving...' : 'Add Contact'}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Search Bar */}
			<div className="mt-6 flex justify-between items-center gap-3">
				<div className="relative flex-1">
					<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
						🔍
					</span>
					<input
						type="text"
						className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Search by name, email, or role..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			{/* Contact Cards Grid */}
			<div className="mt-6">
				{loading ? (
					<div className="grid sm:grid-cols-2 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="border border-gray-200 rounded-xl p-5 bg-white animate-pulse space-y-3">
								<div className="h-5 bg-gray-200 rounded w-1/2" />
								<div className="h-4 bg-gray-100 rounded w-3/4" />
							</div>
						))}
					</div>
				) : error ? (
					<div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-6">
						<p className="text-red-600 mb-4 font-medium">{error}</p>
						<button
							onClick={loadClients}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
						>
							Try Again
						</button>
					</div>
				) : filteredContacts.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-6">
						<div className="text-4xl mb-3">👥</div>
						<h3 className="text-base font-semibold text-gray-800">No contacts found</h3>
						<p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
							{searchQuery
								? 'No contacts match your search query.'
								: 'Add your professors, academic advisors, or study buddies using the button above.'}
						</p>
					</div>
				) : (
					<div className="grid sm:grid-cols-2 gap-4">
						{filteredContacts.map((c) => {
							const id = c._id || c.id;
							const score = c.riskScore ?? c.risk?.score ?? 0;
							const metaRole = c.meta?.role || 'Academic Contact';
							const metaNotes = c.meta?.notes || '';

							return (
								<div
									key={id}
									className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
								>
									<div>
										<div className="flex justify-between items-start gap-2">
											<div>
												<Link
													to={`/clients/${id}`}
													className="font-bold text-gray-900 text-base hover:text-blue-600 transition"
												>
													{c.name || 'Unnamed Contact'}
												</Link>
												<span className="block text-xs text-blue-600 font-medium mt-0.5">
													{metaRole}
												</span>
											</div>
											<button
												onClick={(e) => handleDeleteContact(id, e)}
												className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
												title="Delete Contact"
											>
												🗑️
											</button>
										</div>

										{c.email && (
											<div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
												<span>✉️</span>
												<a href={`mailto:${c.email}`} className="hover:underline">
													{c.email}
												</a>
											</div>
										)}

										{metaNotes && (
											<p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
												{metaNotes}
											</p>
										)}
									</div>

									<div className="mt-4 pt-3 border-t border-gray-100">
										<div className="flex justify-between items-center text-xs mb-1">
											<span className="text-gray-500">Course Risk Priority</span>
											<span className={`font-bold ${score > 70 ? 'text-rose-600' : score > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
												{score}%
											</span>
										</div>
										<div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
											<div
												className={`h-full rounded-full ${
													score > 70 ? 'bg-rose-500' : score > 40 ? 'bg-amber-500' : 'bg-emerald-500'
												}`}
												style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
											/>
										</div>
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
