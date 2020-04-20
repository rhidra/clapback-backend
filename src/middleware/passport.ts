import {IVerifyOptions, Strategy as LocalStrategy} from 'passport-local';
import passport from 'passport';
import UserModel from '../models/UserModel';
import PendingUser from '../models/PendingUserModel';
import moment from 'moment';
import {sendSuccess, hash, sendError} from './utils';
import AuthUser = require('../models/AuthUserModel');

// Time to input the SMS code (in seconds)
const delaySize = 30;

/**
 * Used for classic login authentication email/password
 */
passport.use('email', new LocalStrategy({usernameField: 'email'}, (email: string, password: string, done) => {
  UserModel.findOne({email})
    .then(user => {
      if (!user) { return done(null, false, {errors: {'email or password': 'is invalid'}} as any); }
      return AuthUser.findOne({user: user._id}) as any;
    })
    .then((user: any) => {
      if (!user || !user.validatePassword(password)) {
        return done(null, false, {errors: {'email or password': 'is invalid'}} as unknown as IVerifyOptions);
      }
      return done(null, user);
    }).catch(done);
}));

/**
 * Used for phone login authentication
 * @body {id: Pending user id, phone, code}
 */
passport.use('phone', new LocalStrategy({
    usernameField: 'phone',
    passwordField: 'code',
    passReqToCallback: true},
  (req, phone, code, done) => {
    PendingUser.findOne({_id: req.body.id, phone, codeHashed: hash(code)}).then((user: any) => {
      if (moment(user.date).add(delaySize, 'seconds') >= moment()) {
        user.remove();
        return done(null, {});
      } else {
        return done(null, false);
      }
    }).catch(done);
  }));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export = passport;
