import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

/**
 * Each document is linked to a user.
 * It stores the people who are following the user.
 */
const FollowerSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followers: [{type: Schema.Types.ObjectId, ref: 'User'}],
});

const Follower = mongoose.model('Follower', FollowerSchema);
export = Follower;
