import dotenv from 'dotenv';
// Initialize config file .env
dotenv.config();

import express from 'express';
import createError = require('http-errors');
import mongoose = require('mongoose');
import logger = require('morgan');
import bodyParser = require('body-parser');
import auth from './middleware/passport';
import cors from 'cors';
import indexRouter from './routes/index';
import topicRouter from './routes/topic';
import likeRouter from './routes/like';
import quizRouter from './routes/quiz';
import voteRouter from './routes/vote';
import userRouter from './routes/user';
import mediaRouter from './routes/media';
import authRouter from './routes/auth';
import reactRouter from './routes/reaction';
import commentRouter from './routes/comment';

const port = process.env.PORT || 9000;
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());
app.set('view engine', 'ejs');

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URL).then(() => {
    mongoose.connection.on('error', (err: any) => console.log('Database connection error:', err));
    mongoose.connection.once('open', () => console.log('Connected to Database!'));
}, () => console.log('Not connected to database !'));

app.use(auth.initialize());

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/topic', topicRouter);
app.use('/like', likeRouter);
app.use('/quiz', quizRouter);
app.use('/quiz/vote', voteRouter);
app.use('/user', userRouter);
app.use('/reaction', reactRouter);
app.use('/comment', commentRouter);
app.use('/media', mediaRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)));

// Start the Express server
app.listen(port, () => console.log(`server started at http://localhost:${port}`));
