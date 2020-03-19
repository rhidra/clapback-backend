import * as mongoose from 'mongoose';
import Topic from './TopicModel';
import Reaction from './ReactionModel';
import Comment from './CommentModel';
import {handleError} from '../middleware/utils';

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

LikeSchema.post('save', (doc: any) => {
    if (doc.topic) {
        Topic.findByIdAndUpdate(doc.topic, {$inc: {likesCounter: 1}}, err => handleError(err));
    }
    if (doc.reaction) {
        Reaction.findByIdAndUpdate(doc.reaction, {$inc: {likesCounter: 1}}, err => handleError(err));
    }
    if (doc.comment) {
        Comment.findByIdAndUpdate(doc.comment, {$inc: {likesCounter: 1}}, err => handleError(err));
    }
});

LikeSchema.post('remove', (doc: any) => {
    if (doc.topic) {
        Topic.findByIdAndUpdate(doc.topic, {$inc: {likesCounter: -1}}, err => handleError(err));
    }
    if (doc.reaction) {
        Reaction.findByIdAndUpdate(doc.reaction, {$inc: {likesCounter: -1}}, err => handleError(err));
    }
    if (doc.comment) {
        Comment.findByIdAndUpdate(doc.comment, {$inc: {likesCounter: -1}}, err => handleError(err));
    }
});

export = mongoose.model('Like', LikeSchema);
