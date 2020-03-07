import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * Represents the vote of a user to a quiz.
 */
const VoteSchema = new Schema({
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ID of the choice of the user in Quizz.choices[]
    choice: { type: Schema.Types.ObjectId, required: true},
});

export = mongoose.model('Vote', VoteSchema);
