import dotenv from 'dotenv';
// Initialize config file .env
dotenv.config();

import express, { NextFunction } from 'express';
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
import adminRouter from './routes/admin';
import followRouter from './routes/follow';
import * as Sentry from '@sentry/node';

const port = process.env.PORT || 80;
const app = express();
Sentry.init({
  dsn: 'https://6cae9a572c7748bbae71b7218abc4df0@o373953.ingest.sentry.io/5191229',
  environment: process.env.NODE_ENV
});

// CORS configuration
// https://ionicframework.com/docs/troubleshooting/cors
const allowedOrigins = process.env.NODE_ENV === 'development' ? [
  'http://localhost:8100',
  'http://localhost:4200',
] : [
  // Ionic Mobile App
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:8080',

  // Admin panel
  'https://admin.clapbacktheapp.com',
];
const corsOptions = {
  origin: (origin: string, callback: any) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  }
};

// Sentry request handler
app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);

app.use(logger(process.env.NODE_ENV === 'development' ? 'dev' : 'combined', {
  skip: req => req.originalUrl === '/health' || req.originalUrl === '/'
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors(corsOptions));
app.set('view engine', 'ejs');

// Connecting to MongoDB
const dbURI = process.env.NODE_ENV === 'development' ? 'mongodb://localhost:27017/db' : `mongodb://mongo:27017/db`;
mongoose.connection.on('connecting', () => console.log('connecting to MongoDB...'));
mongoose.connection.on('error', (error) => {
  console.error('Error in MongoDb connection: ' + error);
  mongoose.disconnect();
});
mongoose.connection.on('connected', () => console.log('MongoDB connected!'));
mongoose.connection.once('open', () => console.log('MongoDB connection opened!'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected!'));
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected!');
  mongoose.connect(dbURI, {server: {auto_reconnect: true}});
});
mongoose.connect(dbURI, {server: {auto_reconnect: true}});

app.use(auth.initialize());

// Because of Nginx in prod, image and thumbnails URL are rewritten (the /media prefix is removed),
// which causes problems when deleting images, because the prefix cannot be re-added.
// Instead, we add it manually in Node
// It is not useful yet for thumbnails, because we never use anything other than GET
// TODO: Make that better
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const prefix = '/image'; // Filter according to this prefix
    if (req.url.substring(0, prefix.length) === prefix) {
      req.url = `/media${req.url}`;
    }
    next();

  });
}

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
app.use('/admin', adminRouter);
app.use('/follow', followRouter);

app.get('/health', (req, res) => res.send());

// Sentry error handler
app.use(Sentry.Handlers.errorHandler({
  shouldHandleError(error): boolean {
    // TODO: Filter error by status (e.g. error.status === 404)
    return process.env.NODE_ENV !== 'development';
  }
}) as express.ErrorRequestHandler);

// Catch 404 and forward to error handler
app.use((req, res, next) => next(createError(404)));

// Start the Express server
app.listen(port, () => console.log(`server started at http://localhost:${port}`));
