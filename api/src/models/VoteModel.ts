import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * Represents the vote of a user to a quiz.
 */
const VoteSchema = new Schema({
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },

    // Index of the choice of the user in Quizz.choices[]
    choice: Number,
});

export = mongoose.model('Vote', VoteSchema);
