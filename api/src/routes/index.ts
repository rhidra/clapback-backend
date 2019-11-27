import * as express from 'express';
import * as auth from '../middleware/auth';

const router = express.Router();

router.get('/', (req, res, next) => {
    res.send('Hello world !');
});

router.get('/page', auth.ensureAuthenticated, (req, res) => {
    res.send('logged in !');
});

router.get('/login', auth.ensureAuthenticated, (req, res) => {
    res.redirect('/page');
});

router.get('/logout', (req: any, res) => {
    req.logout();
    res.redirect('/');
});

export = router;
