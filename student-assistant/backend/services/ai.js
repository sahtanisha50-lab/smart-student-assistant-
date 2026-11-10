'use strict';

// Uses OpenAI if OPENAI_API_KEY is set; otherwise, falls back to Hugging Face if HUGGINGFACE_API_KEY is set.
// If neither is set, returns a local placeholder response.

async function generateReply(prompt) {
	const trimmed = (prompt || '').trim();
	if (!trimmed) {
		throw new Error('prompt is required');
	}

	if (process.env.OPENAI_API_KEY) {
		return await callOpenAI(trimmed);
	}
	if (process.env.HUGGINGFACE_API_KEY) {
		return await callHuggingFace(trimmed);
	}
	return `You asked: ${trimmed}\n(No AI provider configured. Set OPENAI_API_KEY or HUGGINGFACE_API_KEY.)`;
}

async function callOpenAI(prompt) {
	const apiKey = process.env.OPENAI_API_KEY;
	const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: 'You are a helpful academic study assistant.' },
				{ role: 'user', content: prompt }
			],
			temperature: 0.2,
			max_tokens: 300
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenAI error: ${res.status} ${text}`);
	}
	const data = await res.json();
	const reply = data?.choices?.[0]?.message?.content?.trim();
	if (!reply) throw new Error('OpenAI returned no content');
	return reply;
}

async function callHuggingFace(prompt) {
	const apiKey = process.env.HUGGINGFACE_API_KEY;
	const model = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
	const res = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 300, temperature: 0.2 } })
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`HF error: ${res.status} ${text}`);
	}
	const data = await res.json();
	// HF responses vary by model; try common shapes
	const reply = Array.isArray(data)
		? (data[0]?.generated_text || data[0]?.summary_text || '')
		: (data?.generated_text || data?.summary_text || '');
	if (!reply) throw new Error('HF returned no content');
	return reply.trim();
}

module.exports = { generateReply };


