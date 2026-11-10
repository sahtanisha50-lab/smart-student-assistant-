import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import useAutoRefetch from '../lib/useAutoRefetch';

export default function Notes() {
	const { token } = useAuth();
	const [notes, setNotes] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Create / Edit Form State
	const [isEditing, setIsEditing] = useState(false);
	const [editId, setEditId] = useState(null);
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [tagInput, setTagInput] = useState('');
	const [tags, setTags] = useState([]);
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);

	// Filter & Search State
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTag, setSelectedTag] = useState('ALL');

	async function loadNotes() {
		setLoading(true);
		setError('');
		try {
			const res = await apiFetch('/notes', { token });
			setNotes(res.notes || []);
		} catch (e) {
			setError(e.message || 'Failed to load notes');
		} finally {
			setLoading(false);
		}
	}

	// Auto refetch on realtime SSE note updates
	useAutoRefetch(['note:created', 'note:updated', 'note:deleted'], '/notes', (res) => {
		setNotes(res?.notes || []);
		setLoading(false);
	}, { autoFetchOnMount: false, setError });

	useEffect(() => {
		if (token) loadNotes();
	}, [token]);

	function handleAddTag(e) {
		if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
			e.preventDefault();
			const cleanTag = tagInput.trim().replace(/^#/, '');
			if (cleanTag && !tags.includes(cleanTag)) {
				setTags([...tags, cleanTag]);
			}
			setTagInput('');
		}
	}

	function removeTag(tagToRemove) {
		setTags(tags.filter((t) => t !== tagToRemove));
	}

	function resetForm() {
		setTitle('');
		setContent('');
		setTags([]);
		setTagInput('');
		setIsEditing(false);
		setEditId(null);
		setFormError('');
	}

	function startEdit(note) {
		setIsEditing(true);
		setEditId(note._id);
		setTitle(note.title);
		setContent(note.content || '');
		setTags(note.tags || []);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function handleSubmit(e) {
		if (e) e.preventDefault();
		setFormError('');
		if (!title.trim()) {
			setFormError('Note title is required');
			return;
		}

		setSaving(true);
		try {
			if (isEditing && editId) {
				const res = await apiFetch(`/notes/${editId}`, {
					method: 'PUT',
					token,
					body: { title: title.trim(), content: content.trim(), tags }
				});
				setNotes(notes.map((n) => (n._id === editId ? res.note : n)));
				toast.success('Note updated successfully!');
			} else {
				const res = await apiFetch('/notes', {
					method: 'POST',
					token,
					body: { title: title.trim(), content: content.trim(), tags }
				});
				setNotes([res.note, ...notes]);
				toast.success('Note created successfully!');
			}
			resetForm();
		} catch (err) {
			setFormError(err.message || 'Failed to save note');
			toast.error(err.message || 'Failed to save note');
		} finally {
			setSaving(false);
		}
	}

	async function removeNote(id) {
		if (!window.confirm('Are you sure you want to delete this note?')) return;
		try {
			await apiFetch(`/notes/${id}`, { method: 'DELETE', token });
			setNotes(notes.filter((n) => n._id !== id));
			toast.success('Note deleted');
			if (editId === id) resetForm();
		} catch (e) {
			toast.error(e.message || 'Failed to delete note');
		}
	}

	// Compute all unique tags for filter chips
	const allTags = Array.from(
		new Set(notes.flatMap((n) => n.tags || []).filter(Boolean))
	);

	// Filtered notes based on search query and selected tag
	const filteredNotes = notes.filter((n) => {
		const matchesTag = selectedTag === 'ALL' || (n.tags && n.tags.includes(selectedTag));
		const q = searchQuery.toLowerCase();
		const matchesQuery =
			!q ||
			n.title.toLowerCase().includes(q) ||
			(n.content && n.content.toLowerCase().includes(q)) ||
			(n.tags && n.tags.some((t) => t.toLowerCase().includes(q)));
		return matchesTag && matchesQuery;
	});

	return (
		<div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<span>📝</span> Study Notes
					</h1>
					<p className="text-gray-600 text-sm mt-1">
						Create, organize, and search your class lecture summaries and study concepts.
					</p>
				</div>
				<div className="text-sm text-gray-500 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium border border-blue-100">
					{notes.length} Total Note{notes.length === 1 ? '' : 's'}
				</div>
			</div>

			{/* Create / Edit Note Form Card */}
			<div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
				<h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
					<span>{isEditing ? '✏️ Edit Note' : '➕ Create New Note'}</span>
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

					<input
						type="text"
						className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Note Title (e.g., Chapter 4: Organic Chemistry Reactions)"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>

					<textarea
						rows={3}
						className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Write your note content, formulas, or key bullet points..."
						value={content}
						onChange={(e) => setContent(e.target.value)}
					/>

					{/* Tag input and tag badges */}
					<div>
						<div className="flex flex-wrap items-center gap-2 mb-2">
							{tags.map((t) => (
								<span
									key={t}
									className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-200 font-medium"
								>
									#{t}
									<button
										type="button"
										onClick={() => removeTag(t)}
										className="hover:text-red-600 font-bold ml-0.5"
									>
										&times;
									</button>
								</span>
							))}
						</div>
						<input
							type="text"
							className="w-full sm:w-80 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="Add tags (type tag and press Enter, e.g. physics, exam)"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={handleAddTag}
						/>
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
							{saving ? 'Saving...' : isEditing ? 'Update Note' : 'Save Note'}
						</button>
					</div>
				</form>
			</div>

			{/* Search and Tag Filter Bar */}
			<div className="mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
				<div className="relative flex-1">
					<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
						🔍
					</span>
					<input
						type="text"
						className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Search notes by keyword, title, or tags..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				{/* Tag Filter Pills */}
				{allTags.length > 0 && (
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
						<button
							onClick={() => setSelectedTag('ALL')}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
								selectedTag === 'ALL'
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							All Tags
						</button>
						{allTags.map((tag) => (
							<button
								key={tag}
								onClick={() => setSelectedTag(tag)}
								className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
									selectedTag === tag
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								#{tag}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Notes Display List */}
			<div className="mt-6">
				{loading ? (
					<div className="grid sm:grid-cols-2 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="border border-gray-200 rounded-xl p-4 bg-white animate-pulse space-y-3">
								<div className="h-5 bg-gray-200 rounded w-2/3" />
								<div className="h-12 bg-gray-100 rounded" />
								<div className="h-4 bg-gray-100 rounded w-1/3" />
							</div>
						))}
					</div>
				) : error ? (
					<div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-6">
						<p className="text-red-600 mb-4 font-medium">{error}</p>
						<button
							onClick={loadNotes}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
						>
							Try Again
						</button>
					</div>
				) : filteredNotes.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-6">
						<div className="text-4xl mb-3">📝</div>
						<h3 className="text-base font-semibold text-gray-800">No notes found</h3>
						<p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
							{searchQuery || selectedTag !== 'ALL'
								? 'No notes match your current search or tag filter.'
								: 'You haven’t created any notes yet. Use the form above to add your first study note!'}
						</p>
					</div>
				) : (
					<div className="grid sm:grid-cols-2 gap-4">
						{filteredNotes.map((n) => (
							<div
								key={n._id}
								className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
							>
								<div>
									<div className="flex justify-between items-start gap-2">
										<h3 className="font-bold text-gray-900 text-base leading-snug">
											{n.title}
										</h3>
										<div className="flex items-center gap-1.5 shrink-0">
											<button
												onClick={() => startEdit(n)}
												className="p-1 text-gray-500 hover:text-blue-600 rounded transition"
												title="Edit Note"
											>
												✏️
											</button>
											<button
												onClick={() => removeNote(n._id)}
												className="p-1 text-gray-500 hover:text-red-600 rounded transition"
												title="Delete Note"
											>
												🗑️
											</button>
										</div>
									</div>

									{n.content && (
										<p className="text-gray-600 text-sm mt-2.5 whitespace-pre-wrap line-clamp-4">
											{n.content}
										</p>
									)}
								</div>

								<div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
									<div className="flex flex-wrap gap-1">
										{(n.tags || []).map((t) => (
											<span
												key={t}
												className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium"
											>
												#{t}
											</span>
										))}
									</div>
									<span className="text-xs text-gray-400">
										{new Date(n.updatedAt || n.createdAt || Date.now()).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric'
										})}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
