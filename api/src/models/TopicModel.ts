import * as mongoose from 'mongoose';
import {addHasLiked} from '../middleware/utils';

const Schema = mongoose.Schema;

const TopicSchema = new Schema({
    title: String,

    hashtags: { type: [String], required: true },
    suggestedHashtags: [String],
    approved: { type: Boolean, default: false },
    date: { type: Date, required: true },

    centerPanel: {
        video: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },

    leftPanel: {
        video: String,
        text: String,
        textAlt: String,
        image: String,
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },

    rightPanel: {
        video: String,
        text: String,
        textAlt: String,
        image: String,
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },

    likesCounter: { type: Number, default: 0 },
    commentsCounter: { type: Number, default: 0 },
    clapbacksCounter: { type: Number, default: 0 },
    viewsCounter: { type: Number, default: 0 },
});

TopicSchema.methods.addHasLiked = function(userId: string): Promise<any> {
    return addHasLiked(this, 'topic', userId);
};

export = mongoose.model('Topic', TopicSchema);
