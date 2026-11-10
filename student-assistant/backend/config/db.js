'use strict';

const mongoose = require('mongoose');

let memoryServer = null;

async function connectToDatabase(mongoUri) {
	mongoose.set('strictQuery', true);

	// Try connecting to provided URI if any
	if (mongoUri) {
		try {
			await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
			return mongoose.connection;
		} catch (err) {
			console.log(`Could not connect to external MongoDB at ${mongoUri} (${err.message}). Falling back to MongoMemoryServer...`);
		}
	}

	// Fallback to in-memory MongoDB
	const { MongoMemoryServer } = require('mongodb-memory-server');
	memoryServer = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
	const memoryUri = memoryServer.getUri();
	console.log(`Using in-memory MongoDB at ${memoryUri}`);
	await mongoose.connect(memoryUri);
	return mongoose.connection;
}

module.exports = { connectToDatabase };



