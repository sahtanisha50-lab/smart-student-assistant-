import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';

const QUICK_PROMPTS = [
	'📅 Create a 5-day active-recall study plan for final exams',
	'💡 Explain how photosynthesis works in simple terms',
	'📝 Give me 3 proven memory retention strategies for students',
	'⏱️ How does the 25/5 Pomodoro method boost study productivity?',
	'🧪 How should I structure a college lab report conclusion?'
];

export default function Chat() {
	const { token } = useAuth();
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState([
		{
			role: 'assistant',
			content:
				"Hello! I am your AI Study Copilot 🎓. Ask me anything about your coursework, exam preparation, formulas, or study schedules!"
		}
	]);

	const messagesEndRef = useRef(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, loading]);

	async function sendMessage(textToSend) {
		const text = (textToSend || input).trim();
		if (!text) return;

		const userMsg = { role: 'user', content: text, timestamp: new Date() };
		setMessages((prev) => [...prev, userMsg]);
		if (!textToSend) setInput('');
		setLoading(true);

		try {
			const res = await apiFetch('/chat', {
				method: 'POST',
				token,
				body: { prompt: text }
			});
			setMessages((prev) => [
				...prev,
				{
					role: 'assistant',
					content: res.reply || 'Here is what I found for your question.',
					timestamp: new Date()
				}
			]);
		} catch (e) {
			setMessages((prev) => [
				...prev,
				{
					role: 'assistant',
					content: `⚠️ Error: ${e.message || 'Could not reach AI assistant.'}`,
					timestamp: new Date()
				}
			]);
		} finally {
			setLoading(false);
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied to clipboard!');
		} catch (_e) {
			toast.info('Selected text');
		}
	}

	async function saveToNotes(content) {
		try {
			const title = `AI Study Note: ${content.slice(0, 30).replace(/\n/g, ' ')}...`;
			await apiFetch('/notes', {
				method: 'POST',
				token,
				body: {
					title,
					content,
					tags: ['ai-study', 'assistant']
				}
			});
			toast.success('Saved to Notes tab!');
		} catch (e) {
			toast.error('Failed to save to notes');
		}
	}

	function clearChat() {
		setMessages([
			{
				role: 'assistant',
				content: "Chat cleared! What study topic would you like to explore next?"
			}
		]);
	}

	return (
		<div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
			{/* Page Header */}
			<div className="flex justify-between items-center pb-4 border-b border-gray-200">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
						<span>🤖</span> AI Study Assistant
					</h1>
					<p className="text-gray-600 text-sm mt-0.5">
						Ask academic questions, generate study schedules, and get instant explanations.
					</p>
				</div>
				<button
					onClick={clearChat}
					className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
				>
					Clear Chat
				</button>
			</div>

			{/* Quick Prompt Chips */}
			<div className="mt-4">
				<p className="text-xs font-semibold text-gray-500 mb-2">Suggested Study Prompts:</p>
				<div className="flex flex-wrap gap-2">
					{QUICK_PROMPTS.map((prompt, idx) => (
						<button
							key={idx}
							onClick={() => sendMessage(prompt.replace(/^[^\s]+\s/, ''))}
							className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium transition text-left"
						>
							{prompt}
						</button>
					))}
				</div>
			</div>

			{/* Chat Messages Container */}
			<div className="mt-5 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-[520px]">
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
					{messages.map((m, idx) => {
						const isUser = m.role === 'user';
						return (
							<div
								key={idx}
								className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
							>
								{/* Avatar */}
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold ${isUser
											? 'bg-blue-600 text-white'
											: 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
										}`}
								>
									{isUser ? '👤' : '🤖'}
								</div>

								{/* Message Bubble */}
								<div
									className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${isUser
											? 'bg-blue-600 text-white rounded-tr-none'
											: 'bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-none'
										}`}
								>
									<p className="whitespace-pre-wrap">{m.content}</p>

									{/* Action buttons on assistant message */}
									{!isUser && idx > 0 && (
										<div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center gap-3 text-xs text-gray-500">
											<button
												onClick={() => copyToClipboard(m.content)}
												className="hover:text-blue-600 flex items-center gap-1 transition"
											>
												📋 Copy
											</button>
											<button
												onClick={() => saveToNotes(m.content)}
												className="hover:text-blue-600 flex items-center gap-1 transition"
											>
												💾 Save to Notes
											</button>
										</div>
									)}
								</div>
							</div>
						);
					})}

					{/* Loading indicator */}
					{loading && (
						<div className="flex items-start gap-3">
							<div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm shrink-0">
								🤖
							</div>
							<div className="bg-gray-100 rounded-2xl p-4 text-sm text-gray-500 rounded-tl-none flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
								<span>Thinking & formulating study reply...</span>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Box Footer */}
				<div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50/50 rounded-b-2xl">
					<div className="flex gap-2">
						<textarea
							rows={1}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Type your study question or topic... (Press Enter to send)"
							className="flex-1 resize-none border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
						/>
						<button
							onClick={() => sendMessage()}
							disabled={loading || !input.trim()}
							className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-sm flex items-center gap-1.5 shrink-0"
						>
							<span>Send</span>
							<span>🚀</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
