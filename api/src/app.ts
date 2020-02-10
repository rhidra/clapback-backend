import dotenv from 'dotenv';
import express from 'express';
import createError = require('http-errors');
import mongoose = require('mongoose');
import logger = require('morgan');
import bodyParser = require('body-parser');
import * as auth from './middleware/auth';
import cors from 'cors';
import indexRouter from './routes/index';
import newsRouter from './routes/news';
import mediaRouter from './routes/media';

// Initialize config file .env
dotenv.config();

const port = process.env.SERVER_PORT;
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URL).then(() => {
    mongoose.connection.on('error', (err: any) => console.log('Database connection error:', err));
    mongoose.connection.once('open', () => console.log('Connected to Database!'));
}, () => console.log('Not connected to database !'));

auth.register(app);

app.use('/', indexRouter);
app.use('/news', newsRouter);
app.use('/media', mediaRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)));

// Start the Express server
app.listen(port, () => console.log(`server started at http://localhost:${port}`));
