import * as express from 'express';
import {sendData_cb, sendError, sendSuccess, hash} from '../middleware/utils';
import PendingUser from '../models/PendingUserModel';
import RefreshTokenModel from '../models/RefreshTokenModel';
import moment from 'moment';
import UserModel from '../models/UserModel';
import jwt from 'express-jwt';
import passport from '../middleware/passport';
import express_jwt_permissions from 'express-jwt-permissions';

const guard = express_jwt_permissions();
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});

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
    user.save().then(() => {
        const refreshToken: string = (RefreshTokenModel as any).generate(user._id);
        res.json(Object.assign({refreshToken}, user.toAuthJSON()));
    });
});

/**
 * POST /auth/login
 * Classic email/password login
 * @body {email, password}
 */
router.post('/login', passport.authenticate('email'), (req: express.Request, res: express.Response) => {
    const refreshToken: string = (RefreshTokenModel as any).generate((req.user as any).id);
    res.json(Object.assign({refreshToken}, (req.user as any).toAuthJSON()));
});

/**
 * POST /auth/token
 * Send a new JWT token, useful when the previous token is expired.
 * Need a refresh token, created at login.
 * @body {id: userId, refreshToken}
 */
router.post('/token', (req: express.Request, res: express.Response) => {
    const p: Array<Promise<any>> = [];
    p.push(UserModel.findById(req.body.id).exec());
    p.push(RefreshTokenModel.findOne({userId: req.body.id, token: req.body.refreshToken,
        status: 'active', exp: {$gte: moment()}}).exec());
    Promise.all(p).then((t: any) => {
        const [user, refreshToken] = t;
        if (!user || !user.permissions.includes('user')) { sendError('Permission denied !', res, 403); }
        if (!refreshToken) { sendError('Refresh token invalid !', res, 403); }
        res.json(user.toAuthJSON());
    });
});

/**
 * POST /auth/token/reject
 * Revoke a refresh token when it is compromised
 * @body {refreshToken}
 */
router.post('/token/reject', auth, guard.check('admin'), (req: express.Request, res: express.Response) => {
    RefreshTokenModel.find({token: req.body.refreshToken}).then(tokens => {
        tokens.forEach((token: any) => {
            token.status = 'revoked';
            token.save();
        });
        sendSuccess(res);
    });
});

// TODO: Remove this route
router.get('/data', auth, guard.check('user'), (req, res) => {
    console.log(req);
    res.json({data: 'success', user: req.user});
});

/**
 * SMS Phone Login protocol :
 * - App sends phone number to the backend :
 *      POST /auth/phone
 *      @body {phone}
 * - Backend generate SMS code linked to the timestamp
 * - Backend store info temporarily in the DB
 * - API YunPian sends SMS code
 * - User receives the SMS, input the code and send it to the backend
 *      POST /auth/phone/login/
 *      @body {id: Pending user id, phone, code}
 * - Backend test the validity of the code
 * - Backend search the user in Okta, either create the user or just get his ID
 * - Backend authenticate the user with Okta's API and get the token
 * - Mobile app get the token and use it in every backend call
 * - Mobile app grants the access to the content
 *
 */

router.post('/phone', (req: express.Request, res: express.Response) => {
    const code = Math.floor(100000 + Math.random() * 900000) + '';

    // TODO: Send the code to the SMS API
    console.log('Code generated :', code);
    // ...

    const codeHashed = hash(code);
    PendingUser.create({date: moment().format(), phone: req.body.phone, codeHashed})
        .then(user => res.send({id: user._id}));
});

router.post('/phone/login', passport.authenticate('phone'), (req: express.Request, res: express.Response) => {
    UserModel.findOne({phone: req.body.phone}).then((user: any) => {
        if (user) {
            // Log the user in
            const refreshToken: string = (RefreshTokenModel as any).generate(user._id);
            res.json(Object.assign({refreshToken}, user.toAuthJSON()));
        } else {
            // Register the user
            user = new UserModel({phone: req.body.phone});
            user.addPermission('user');
            user.save().then(() => {
                const refreshToken: string = (RefreshTokenModel as any).generate(user._id);
                res.json(Object.assign({refreshToken}, user.toAuthJSON()));
            });
        }
    }).catch(() => sendError('', res));
});

router.delete('/login', (req: express.Request, res: express.Response) => {
    PendingUser.remove({}, err => res.send(err));
});

router.get('/login', (req: express.Request, res: express.Response) => {
    PendingUser.find().then(data => res.send(data));
});

export = router;