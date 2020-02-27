import mongoose, {Model} from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

const UserSchema = new Schema({
    email: String,
    phone: String,

    // Permissions granted to the user
    // Format: ['user', 'admin']
    // admin: superuser who has all rights
    // editor: has access to basic editing function
    // user: basic user
    permissions: {
        type: [String],
        required: true,
        default: ['user'],
        enum: ['user', 'editor', 'admin'],
    },

    // Hashed password
    hash: {
        type: String,
        select: false,
    },

    // Random string added to the password hash
    salt: {
      type: String,
      select: false,
    },
});

UserSchema.methods.setPassword = function(password: string) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function(password: string) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {
    return jwt.sign({
        email: this.email,
        phone: this.phone,
        id: this._id,
        permissions: this.permissions,
    }, process.env.JWT_SECRET, {expiresIn: 300});
};

UserSchema.methods.toAuthJSON = function() {
    return {
        id: this._id,
        email: this.email,
        phone: this.phone,
        permissions: this.permissions,
        token: this.generateJWT(),
    };
};

UserSchema.methods.addPermission = function(perm: string) {
    if (!this.permissions.find((p: string) => p === perm)) {
        this.permissions.push(perm);
    }
};

const User = mongoose.model('User', UserSchema);
export = User;
