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
});

UserSchema.methods.generateJWT = function() {
    return jwt.sign({
        _id: this.user,
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
