import * as express from 'express';
import mongoose from 'mongoose';
import {sendData, sendData_cb} from '../middleware/utils';
import Reaction from '../models/ReactionModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

router.route('/')

/**
 * GET /reaction
 * Send all reaction
 * @param populate
 */
  .get(auth, guard.check('user'), (req, res) => Reaction.find({})
    .then(docs => {
      if (req.query.populate && req.query.populate === 'true') {
        return Promise.all(docs.map(e => e.populate('user').populate('topic').execPopulate()));
      }
      return Promise.resolve(docs);
    })
    .then(docs => sendData(res, null, docs)))

  /**
   *  POST /reaction
   * Create a quiz
   */
  .post(auth, guard.check('user'), (req, res) => Reaction.create(req.body, sendData_cb(res)));

router.route('/:id')
/**
 * GET /reaction/:id
 * Send a reaction
 */
  .get((req, res) => Reaction.findById(req.params.id).populate('user').populate('topic').exec(sendData_cb(res)))

/**
 * POST /quiz/:id
 * Modify a quiz.
 */
  .post(auth, guard.check('user'), (req, res) =>
    Reaction.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
  .delete(auth, guard.check('user'), (req, res) => Reaction
    .findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
