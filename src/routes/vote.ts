import * as express from 'express';
import mongoose from 'mongoose';
import {sendData, sendData_cb, sendError, sendSuccess} from '../middleware/utils';
import Vote from '../models/VoteModel';
import Quiz from '../models/QuizModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

/**
 * GET /quiz/vote/:idQuiz
 * Retrieve a vote
 *
 * POST /quiz/vote/:idQuiz
 * Vote for a quiz
 * @body {choice}
 *
 * DELETE /quiz/vote/:idQuiz
 * Delete a vote for the specific quiz for the user
 */
// TODO: Protect against malicious users
router.route('/:idQuiz')
  .get(auth, guard.check('user'), (req, res) =>
    Vote.findOne({quiz: req.params.idQuiz, user: (req.user as any)._id}, sendData_cb(res)))

  .post(auth, guard.check('user'), (req, res) => Vote
    .findOne({quiz: req.params.idQuiz, user: (req.user as any)._id}).then((duplicate: any) => {
      if (!duplicate) {
        return Vote
          .create({quiz: req.params.idQuiz, user: (req.user as any)._id, choice: req.body.choice}, sendData_cb(res));
      } else if (duplicate.choice !== req.body.choice) {
        duplicate.remove();
        return Vote
          .create({quiz: req.params.idQuiz, user: (req.user as any)._id, choice: req.body.choice}, sendData_cb(res));
      }
      return sendSuccess(res);
    }))

  .delete(auth, guard.check('user'), (req, res) => Vote
    .deleteMany({quiz: req.params.idQuiz, user: (req.user as any)._id}, sendData_cb(res))
  );

/**
 * GET /quiz/vote/:idQuiz/results
 * Retrieve the results of the quiz, with the format [{choice, count}].
 */
router.get('/:idQuiz/results', auth, guard.check('user'), (req, res) => Quiz.findById(req.params.idQuiz)
  .then((quiz: any) => Promise.all(quiz.choices
    .map((choice: any) => Vote
      .count({quiz: quiz._id, choice: choice._id}).exec()))
    .then((counts: Array<number|any>) =>
      sendData(res, null, counts.map((count, i) => ({choice: quiz.choices[i]._id, count}))))
  ).catch(err => sendError(err, res, 400))
);

export = router;
