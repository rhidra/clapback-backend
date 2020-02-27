import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const QuizSchema = new Schema({
    question: String,
    content: { type: String, required: false },
    topic: { type: Schema.Types.ObjectId, ref: 'NewsTopic' },

    choices: [{
        text: String,
        color: String,
    }],
});

export = mongoose.model('Quiz', QuizSchema);
