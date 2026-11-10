'use strict';
//npm install dotenv
const dotenv = require('dotenv');
dotenv.config();





const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const apiRouter = require('./routes');
const { connectToDatabase } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Swagger/OpenAPI setup
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Student Assistant API',
			version: '1.0.0'
		}
	},
	apis: ['./routes/*.js', './controllers/*.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// API routes
app.use('/api', apiRouter);

// centralized error handler (last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';

async function start() {
	try {
		await connectToDatabase(MONGODB_URI);
		console.log('Connected to MongoDB');
		app.listen(PORT, () => {
			console.log(`Backend server listening on port ${PORT}`);
		});
	} catch (err) {
		console.error('Failed to start server:', err.message);
		process.exit(1);
	}
}

start();


