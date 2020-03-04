import * as express from 'express';
import mongoose from 'mongoose';
import {sendData, sendData_cb, sendError} from '../middleware/utils';
import Quiz from '../models/QuizModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

/**
 * GET /quiz
 * Send all quiz
 *
 * POST /quiz
 * Create a quiz
 */
router.route('/')
  .get(auth, guard.check('creator'), (req, res) => Quiz.find({}, sendData_cb(res)))
  .post(auth, guard.check('creator'), (req, res) => Quiz.create(req.body, sendData_cb(res)));

router.route('/:id')
  .get(auth, guard.check('creator'), (req, res) => Quiz.findById(req.params.id, sendData_cb(res)))

  /**
   * POST /quiz/:id
   * Modify a quiz.
   */
  .post(auth, guard.check('creator'), (req, res) =>
    Quiz.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
  .delete(auth, guard.check('creator'), (req, res) => Quiz.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
