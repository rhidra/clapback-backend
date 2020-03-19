import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * Represents the like of a user to a topic, a reaction or a comment.
 */
const LikeSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: false },
    reaction: { type: Schema.Types.ObjectId, ref: 'Reaction', required: false },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment', required: false },
});

export = mongoose.model('Like', LikeSchema);
