import * as mongoose from 'mongoose';
import {addHasLiked, isVideoProcessed} from '../middleware/utils';

const Schema = mongoose.Schema;

const TopicSchema = new Schema({
    title: String,

    hashtags: { type: [String], required: true },
    suggestedHashtags: [String], // TODO: Suggest hashtags in a smarter way
    isPublic: { type: Boolean, default: false, required: true },
    isProcessing: { type: Boolean, default: false, required: true },
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

TopicSchema.methods.isProcessed = async function(): Promise<boolean> {
    return await isVideoProcessed(this.centerPanel.video)
        && await isVideoProcessed(this.leftPanel.video)
        && await isVideoProcessed(this.rightPanel.video);
};

export = mongoose.model('Topic', TopicSchema);
