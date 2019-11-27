import * as express from 'express';
import * as auth from '../middleware/auth';
import mongoose from 'mongoose';
import {Request, Response} from 'express';

const db = mongoose.connection;
const router = express.Router();

router.get('/', (req: express.Request, res: express.Response) => {
    res.send('Hello !');
});

router.get('/page', auth.ensureAuthenticated, (req: Request, res: Response) => {
    res.send('logged in !');
});

router.get('/login', auth.ensureAuthenticated, (req: Request, res: Response) => {
    res.redirect('/page');
});

router.get('/logout', (req: any, res: Response) => {
    req.logout();
    res.redirect('/');
});

export = router;
