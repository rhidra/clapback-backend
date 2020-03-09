import * as express from 'express';
import {sendError, sendSuccess, hash, sendData_cb} from '../middleware/utils';
import PendingUser from '../models/PendingUserModel';
import RefreshTokenModel from '../models/RefreshTokenModel';
import moment from 'moment';
import User from '../models/UserModel';
import jwt from 'express-jwt';
import passport from '../middleware/passport';
import express_jwt_permissions from 'express-jwt-permissions';
import {Mailer} from '../middleware/mail';
import AuthUser from '../models/AuthUserModel';

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
  if (!email || !password) { return sendError('Email and password required !', res); }
  User.findOne({email, emailValidated: true}).then(u => {
    if (u) { return sendError('The email address already exists', res); }

    const user: any = new User({email});
    user.addPermission('user');
    const authUser: any = new AuthUser({user});
    authUser.setPassword(password);

    Promise.all([authUser.save(), user.save()]).then(newUser => {
      const refreshToken: string = (RefreshTokenModel as any).generate(user._id);
      res.json(Object.assign({refreshToken}, user.toAuthJSON()));

      Mailer.sendMail(email, 'Welcome in 左右 !', 'registration.ejs', {
        email,
        tokenUrl: process.env.HOST_URL + '/auth/email/' + (newUser[0] as any).emailToken
      });
    });
  });
});

/**
 * GET /auth/email/:tokenEmail
 * Validate the email address of the corresponding user
 */
router.get('/email/:token', (req, res) =>
  AuthUser.findOne({emailValidated: false, emailToken: req.query.token}).then((user: any) => {
    if (user) {
      user.emailToken = '';
      user.emailValidated = true;
      return user.save();
    }
    return Promise.resolve();
  // TODO: Make a better redirection
  }).then(() => res.redirect(process.env.NODE_ENV === 'production' ? 'http://zuoyou.cn/emailConfirmation' : 'http://google.com'))
);

/**
 * POST /auth/login
 * Classic email/password login
 * @body {email, password}
 */
router.post('/login', passport.authenticate('email'), (req, res) => User.findById((req.user as any).user)
  .then((user: any) => {
    const refreshToken: string = (RefreshTokenModel as any).generate((req.user as any).user);
    res.json(Object.assign({refreshToken}, user.toAuthJSON()));
  })
);

/**
 * POST /auth/reset
 * Password reset for email/password login
 * @body {email}
 */
router.post('/reset', (req, res) =>
  User.findOne({email: req.body.email}).then(user => {
    // TODO: Move the password related data in another model
  })
);

/**
 * POST /auth/token
 * Send a new JWT token, useful when the previous token is expired.
 * Need a refresh token, created at login.
 * @body {id: userId, refreshToken}
 */
router.post('/token', (req: express.Request, res: express.Response) => {
  const p: Array<Promise<any>> = [];
  p.push(User.findById(req.body.id).exec());
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
  User.findOne({phone: req.body.phone}).then((user: any) => {
    if (user) {
      // Log the user in
      const refreshToken: string = (RefreshTokenModel as any).generate(user._id);
      res.json(Object.assign({refreshToken}, user.toAuthJSON()));
    } else {
      // Register the user
      user = new User({phone: req.body.phone});
      user.addPermission('user');
      user.save().then(() => {
        const refreshToken: string = (RefreshTokenModel as any).generate(user._id);
        res.json(Object.assign({refreshToken}, user.toAuthJSON()));
      });
    }
  }).catch(() => sendError('', res));
});

export = router;
