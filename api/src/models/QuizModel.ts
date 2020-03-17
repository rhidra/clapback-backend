import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const QuizSchema = new Schema({
    question: String,
    content: { type: String, required: false },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
    isPoll: { type: Boolean, default: false },

    choices: [{
        text: String,
        color: String,
        goodAnswer: { type: Boolean, default: false },
    }],
});

export = mongoose.model('Quiz', QuizSchema);
