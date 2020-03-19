import * as mongoose from 'mongoose';
import Topic from './TopicModel';
import {handleError} from '../middleware/utils';
import Reaction from './ReactionModel';

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

CommentSchema.post('save', (doc: any) => {
    if (doc.topic) {
        Topic.findByIdAndUpdate(doc.topic, {$inc: {commentsCounter: 1}}, err => handleError(err));
    }
    if (doc.reaction) {
        Reaction.findByIdAndUpdate(doc.reaction, {$inc: {commentsCounter: 1}}, err => handleError(err));
    }
});

CommentSchema.post('remove', (doc: any) => {
    if (doc.topic) {
        Topic.findByIdAndUpdate(doc.topic, {$inc: {commentsCounter: -1}}, err => handleError(err));
    }
    if (doc.reaction) {
        Reaction.findByIdAndUpdate(doc.reaction, {$inc: {commentsCounter: -1}}, err => handleError(err));
    }
});

export = mongoose.model('Comment', CommentSchema);
