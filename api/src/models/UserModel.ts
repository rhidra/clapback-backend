import mongoose, {Model} from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

const UserSchema = new Schema({
    name: String,
    email: String,
    phone: String,
    image: String,

    // Badge level of a user
    level: { type: String, required: true, default: 'level1', enum: ['level1', 'level2', 'level3'] },

    // Is the user a member of the ZuoYou team ?
    verified: { type: Boolean, default: false },

    // Permissions granted to the user
    // Format: ['user', 'admin']
    // admin: superuser who has all rights
    // editor: approve content for publishing
    // creator: upload content
    // user: basic user
    permissions: { type: [String], required: true, default: ['user'], enum: ['user', 'creator', 'editor', 'admin'] },

    // Hashed password
    hash: { type: String, select: false },

    // Random string added to the password hash
    salt: { type: String, select: false },
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
        _id: this._id,
        email: this.email,
        phone: this.phone,
        permissions: this.permissions,
    }, process.env.JWT_SECRET, {expiresIn: 300});
};

UserSchema.methods.toAuthJSON = function() {
    return {
        user: {
            _id: this._id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            image: this.image,
            level: this.level,
            verified: this.verified,
            permissions: this.permissions,
        },
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
