import dotenv from 'dotenv';
import express from 'express';
import createError = require('http-errors');
import mongoose = require('mongoose');
import logger = require('morgan');
import * as auth from './middleware/auth';
import indexRouter from './routes/index';

// Initialize config file .env
dotenv.config();

const port = process.env.SERVER_PORT;
const app = express();

app.use(logger('dev'));
app.use(express.json());

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URL).then(() => {
    mongoose.connection.on('error', (err: any) => console.log('Database connection error:', err));
    mongoose.connection.once('open', () => console.log('Connected to Database!'));
}, () => console.log('Not connected !!!!'));

auth.register(app);

app.use('/', indexRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)));

// Start the Express server
app.listen(port, () => console.log(`server started at http://localhost:${port}`));
