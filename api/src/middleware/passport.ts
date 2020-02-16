import {IVerifyOptions, Strategy as LocalStrategy} from 'passport-local';
import passport from 'passport';
import UserModel from '../models/UserModel';

passport.use(new LocalStrategy({usernameField: 'email'}, (email: string, password: string, done) => {
    UserModel.findOne({ email })
        .then((user: any) => {
            if (!user || !user.validatePassword(password)) {
                return done(null, false, {errors: {'email or password': 'is invalid'}} as unknown as IVerifyOptions);
            }
            return done(null, user);
        }).catch(done);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

export = passport;
