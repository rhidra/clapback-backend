import mongoose, {Model} from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User = require('./UserModel');

const { Schema } = mongoose;

const AuthUserSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Is the email address of the user verified ?
    emailValidated: { type: Boolean, default: false },
    emailToken: { type: String, required: true, default: () => crypto.randomBytes(32).toString('hex')},

    // Hashed password
    hash: { type: String },

    // Random string added to the password hash
    salt: { type: String },
});

AuthUserSchema.methods.setPassword = function(password: string) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

AuthUserSchema.methods.validatePassword = function(password: string) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

const AuthUser = mongoose.model('AuthUser', AuthUserSchema);
export = AuthUser;
