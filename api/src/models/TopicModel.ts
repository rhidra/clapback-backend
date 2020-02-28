import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const TopicSchema = new Schema({
    title: String,

    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    video: { type: String, required: true },
    hashtag: { type: String, required: true },
    approved: { type: Boolean, default: false },
    date: { type: Date, required: true },

    leftPanel: {
        video: String,
        text: String,
        image: String,
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    },

    rightPanel: {
        video: String,
        text: String,
        image: String,
        quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    },
});

export = mongoose.model('Topic', TopicSchema);
