import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * Represents the like of a user to a news topic.
 */
const LikeSchema = new Schema({
    topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
});

export = mongoose.model('Like', LikeSchema);
