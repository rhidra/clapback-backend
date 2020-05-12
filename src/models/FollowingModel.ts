import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

/**
 * Each document is linked to a user.
 * It represents the users that this user is following.
 */
const FollowingSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: [{type: Schema.Types.ObjectId, ref: 'User'}],
});

const Following = mongoose.model('Following', FollowingSchema);
export = Following;
