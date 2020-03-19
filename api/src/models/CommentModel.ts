import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * A reaction of a user to a news topic.
 * If it is a video (and an optional text), it is a clapback.
 * If it is a text, it is just a comment.
 */
const CommentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, default: Date.now },

    topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: false },
    reaction: { type: Schema.Types.ObjectId, ref: 'Reaction', required: false},

    text: String,

    likesCounter: { type: Number, default: 0 },
});

export = mongoose.model('Comment', CommentSchema);
