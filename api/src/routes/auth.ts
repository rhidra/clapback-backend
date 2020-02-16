import * as express from 'express';
import {sendError, sendSuccess} from '../middleware/utils';
import crypto from 'crypto';
import PendingUser from '../models/PendingUserModel';
import moment from 'moment';
import UserModel from '../models/UserModel';
import jwt from 'express-jwt';
import passport from '../middleware/passport';
import express_jwt_permissions from 'express-jwt-permissions';

const guard = express_jwt_permissions();
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});

// Time to input the SMS code (in seconds)
const delaySize = 30;

/**
 * POST /auth/registration
 * Classic email/password registration
 */
router.post('/register', (req: express.Request, res: express.Response) => {
    const email = req.body.email;
    const password = req.body.password;
    if (!email || !password) { sendError('Email and password required !', res); }

    const user: any = new UserModel({email});
    user.addPermission('user');
    user.setPassword(password);
    user.save().then(() => res.json({user: user.toAuthJSON()}));
});

/**
 * POST /auth/login
 * Classic email/password login
 */
router.post('/login', passport.authenticate('local'), (req: express.Request, res: express.Response) => {
    (req.user as any).generateJWT();
    res.json({user: (req.user as any).toAuthJSON()});
});

router.get('/data', auth, guard.check('user'), (req, res) => {
    console.log(req);
    res.json({data: 'success', user: req.user});
});

/**
 * SMS Phone Login protocol :
 * - App sends phone number to the backend :
 *      POST /auth/
 *          phone: phone number of the user
 * - Backend generate SMS code linked to the timestamp
 * - Backend store info temporarily in the DB
 * - Use API YunPian to send SMS code
 * - User receives the SMS, input the code and send it to the backend
 *      POST /auth/login/
 *          phone: phone number of the user
 *          code: code received by SMS by the user
 * - Backend test the validity of the code
 * - Backend search the user in Okta, either create the user or just get his ID
 * - Backend authenticate the user with Okta's API and get the token
 * - Mobile app get the token and use it in every backend call
 * - Mobile app grants the access to the content
 *
 */

router.post('/', (req: express.Request, res: express.Response) => {
    const code = Math.floor(100000 + Math.random() * 900000) + '';
    console.log('Code generated :', code);

    // TODO: Send the code to the SMS API
    // ...

    const codeHashed = hash(code);
    PendingUser.create({date: moment().format(), phone: req.body.phone, codeHashed})
        .then(user => res.send({id: user._id}));
});

router.post('/login', (req: express.Request, res: express.Response) => {
    const now = moment();
    const phone = req.body.phone;
    PendingUser.findOne({_id: req.body.id, phone, codeHashed: hash(req.body.code)}).then((user: any) => {
        if (moment(user.date).add(delaySize, 'seconds') >= now) {
            user.remove();
            sendSuccess(res);
        } else {
            sendError('Code outdated !', res);
        }
    }).catch(err => {
        sendError('Code invalid !', res);
    });
});

router.delete('/login', (req: express.Request, res: express.Response) => {
    PendingUser.remove({}, err => res.send(err));
});

router.get('/login', (req: express.Request, res: express.Response) => {
    PendingUser.find().then(data => res.send(data));
});

function hash(data: string): string {
    const h = crypto.createHash('sha256');
    h.update(data);
    return h.digest('hex');
}

export = router;
