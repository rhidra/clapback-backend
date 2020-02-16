import mongoose from 'mongoose';
import uuidv4 from 'uuid/v4';
import moment = require('moment');

const { Schema } = mongoose;

/**
 * List all the token used to generate a new access JWT token.
 * If an attack happens, the refresh token of the user should be revoked.
 * A revoked refresh token cannot generate new access JWT token and is useless.
 */
const RefreshTokenSchema = new Schema({
    userId: String,
    token: String,
    exp: Date,
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active',
    }
});

RefreshTokenSchema.statics.generate = function(userId: string) {
    const token = this({userId, token: uuidv4() + uuidv4() + uuidv4() + uuidv4(), status: 'active', exp: moment().add(1, 'month')});
    token.save();
    return token.token;
};

export = mongoose.model('RefreshToken', RefreshTokenSchema);
