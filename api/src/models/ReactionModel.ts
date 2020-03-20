import * as mongoose from 'mongoose';
import Topic from './TopicModel';
import {handleError} from '../middleware/utils';

const Schema = mongoose.Schema;

/**
 * A reaction of a user to a news topic.
 * If it is a video (and an optional text), it is a clapback.
 * If it is a text, it is just a comment.
 */
const ReactionSchema = new Schema({
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, default: Date.now },

    video: String,
    text: String,

    likesCounter: { type: Number, default: 0 },
    commentsCounter: { type: Number, default: 0 },
    viewsCounter: { type: Number, default: 0 },
});

ReactionSchema.post('save', (doc: any) => {
    if (doc.topic) {
        Topic.findByIdAndUpdate(doc.topic, {$inc: {clapbacksCounter: 1}}, err => handleError(err));
    }
});

ReactionSchema.post('remove', (doc: any) => {
    if (doc.topic) {
        Topic.findByIdAndUpdate(doc.topic, {$inc: {clapbacksCounter: -1}}, err => handleError(err));
    }
});

export = mongoose.model('Reaction', ReactionSchema);
