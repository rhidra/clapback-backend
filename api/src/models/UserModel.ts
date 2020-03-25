import mongoose, {Model} from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

const UserSchema = new Schema({
    name: String,
    email: String,
    phone: String,
    image: String,
    description: String,

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

    viewsCounter: { type: Number, default: 0 },
    likesCounter: { type: Number, default: 0 },
    clapbacksCounter: { type: Number, default: 0 },
    commentsCounter: { type: Number, default: 0 },
});

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
            description: this.description,
            level: this.level,
            verified: this.verified,
            permissions: this.permissions,
            viewsCounter: this.viewsCounter,
            likesCounter: this.likesCounter,
            clapbacksCounter: this.clapbacksCounter,
            commentsCounter: this.commentsCounter,
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
