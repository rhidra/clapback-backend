import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const TopicSchema = new Schema({
    title: String,

    hashtag: { type: String, required: true },
    approved: { type: Boolean, default: false },
    date: { type: Date, required: true },

    centerPanel: {
        video: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },

    leftPanel: {
        video: String,
        text: String,
        image: String,
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },

    rightPanel: {
        video: String,
        text: String,
        image: String,
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
});

export = mongoose.model('Topic', TopicSchema);
