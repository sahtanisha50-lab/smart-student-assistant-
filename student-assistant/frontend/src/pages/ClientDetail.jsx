import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import useAutoRefetch from '../lib/useAutoRefetch';

export default function ClientDetail() {
	const { id } = useParams();
	const { token } = useAuth();
	const navigate = useNavigate();

	const [client, setClient] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Edit Mode State
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [role, setRole] = useState('');
	const [riskScore, setRiskScore] = useState(50);
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);

	async function loadClient() {
		setLoading(true);
		setError('');
		try {
			const res = await apiFetch(`/clients/${id}`, { token });
			const c = res.client || res;
			setClient(c);
			setName(c.name || '');
			setEmail(c.email || '');
			setRole(c.meta?.role || 'Professor');
			setRiskScore(c.riskScore ?? c.risk?.score ?? 50);
			setNotes(c.meta?.notes || '');
		} catch (e) {
			setError(e.message || 'Failed to load contact');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (token && id) loadClient();
	}, [token, id]);

	useAutoRefetch(['client:updated'], `/clients/${id}`, (res) => {
		const c = res?.client || res;
		if (c) {
			setClient(c);
			setName(c.name || '');
			setEmail(c.email || '');
			setRole(c.meta?.role || 'Professor');
			setRiskScore(c.riskScore ?? c.risk?.score ?? 50);
			setNotes(c.meta?.notes || '');
		}
	}, { autoFetchOnMount: false });

	async function handleSaveEdit(e) {
		e.preventDefault();
		setSaving(true);
		try {
			const res = await apiFetch(`/clients/${id}`, {
				method: 'PUT',
				token,
				body: {
					name: name.trim(),
					email: email.trim(),
					riskScore: Number(riskScore),
					meta: { role, notes: notes.trim() }
				}
			});
			const updated = res.client || res;
			setClient(updated);
			setIsEditing(false);
			toast.success('Contact details updated!');
		} catch (err) {
			toast.error(err.message || 'Failed to update contact');
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!window.confirm('Are you sure you want to delete this contact?')) return;
		try {
			await apiFetch(`/clients/${id}`, { method: 'DELETE', token });
			toast.success('Contact removed');
			navigate('/clients');
		} catch (err) {
			toast.error(err.message || 'Failed to delete contact');
		}
	}

	if (loading) {
		return (
			<div className="max-w-3xl mx-auto p-6">
				<div className="bg-white border rounded-xl p-6 animate-pulse space-y-4">
					<div className="h-6 bg-gray-200 rounded w-1/3" />
					<div className="h-4 bg-gray-100 rounded w-1/2" />
					<div className="h-20 bg-gray-50 rounded" />
				</div>
			</div>
		);
	}

	if (error || !client) {
		return (
			<div className="max-w-3xl mx-auto p-6 text-center">
				<div className="bg-white border rounded-xl p-8">
					<p className="text-red-600 font-medium mb-4">{error || 'Contact not found'}</p>
					<Link to="/clients" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
						&larr; Back to Contacts
					</Link>
				</div>
			</div>
		);
	}

	const score = client.riskScore ?? client.risk?.score ?? 50;

	return (
		<div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
			<div className="mb-4">
				<Link to="/clients" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium">
					&larr; Back to all contacts
				</Link>
			</div>

			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				{isEditing ? (
					<form onSubmit={handleSaveEdit} className="space-y-4">
						<h2 className="text-lg font-bold text-gray-900">Edit Contact Details</h2>

						<div>
							<label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
							<input
								type="text"
								className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>

						<div className="grid sm:grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
								<input
									type="email"
									className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Role / Affiliation</label>
								<select
									className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
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

						<div>
							<div className="flex justify-between items-center mb-1">
								<label className="text-xs font-medium text-gray-600">Course Risk Priority ({riskScore}%)</label>
							</div>
							<input
								type="range"
								min="0"
								max="100"
								className="w-full"
								value={riskScore}
								onChange={(e) => setRiskScore(e.target.value)}
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-gray-600 mb-1">Office Hours / Notes</label>
							<textarea
								rows={3}
								className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={() => setIsEditing(false)}
								className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
							>
								{saving ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</form>
				) : (
					<div>
						<div className="flex justify-between items-start gap-4">
							<div>
								<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
									{client.meta?.role || 'Academic Contact'}
								</span>
								<h1 className="text-2xl font-bold text-gray-900 mt-2">{client.name}</h1>
								{client.email && (
									<p className="text-sm text-gray-600 mt-1">
										✉️{' '}
										<a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
											{client.email}
										</a>
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setIsEditing(true)}
									className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
								>
									✏️ Edit
								</button>
								<button
									onClick={handleDelete}
									className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-sm font-medium transition"
								>
									🗑️ Delete
								</button>
							</div>
						</div>

						<div className="mt-6 pt-6 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
							<div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
								<span className="text-xs text-gray-500 font-medium">Risk / Priority Level</span>
								<div className="text-2xl font-extrabold mt-1 text-gray-900 flex items-center gap-2">
									<span>{score}%</span>
									<span className={`text-xs px-2 py-0.5 rounded font-normal ${score > 70 ? 'bg-rose-100 text-rose-700' : score > 40 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
										{score > 70 ? 'High Focus' : score > 40 ? 'Medium' : 'On Track'}
									</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
									<div
										className={`h-full rounded-full ${score > 70 ? 'bg-rose-500' : score > 40 ? 'bg-amber-500' : 'bg-emerald-500'
											}`}
										style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
									/>
								</div>
							</div>

							<div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
								<span className="text-xs text-gray-500 font-medium">Last Updated</span>
								<div className="text-sm font-medium mt-1 text-gray-800">
									{new Date(client.updatedAt || client.createdAt || Date.now()).toLocaleString()}
								</div>
							</div>
						</div>

						{client.meta?.notes && (
							<div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
								<span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
									Office Hours & Course Notes
								</span>
								<p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
									{client.meta.notes}
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
