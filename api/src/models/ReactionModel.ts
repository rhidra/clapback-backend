import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * A reaction of a user to a news topic.
 * If it is a video (and an optional text), it is a clapback.
 * If it is a text, it is just a comment.
 */
const ReactionSchema = new Schema({
    topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, required: true, default: Date.now },

    video: String,
    text: String,
});

export = mongoose.model('Reaction', ReactionSchema);
