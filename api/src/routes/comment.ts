import * as express from 'express';
import mongoose, {MongooseDocument} from 'mongoose';
import {sendData, sendData_cb, sendError} from '../middleware/utils';
import Comment from '../models/CommentModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const notAuth = jwt({secret: process.env.JWT_SECRET, credentialsRequired: false});
const guard = express_jwt_permissions();

router.route('/')

/**
 * GET /comment
 * Send all comments
 * @param topic (mandatory if no reaction)
 * @param reaction (mandatory if no topic)
 * @param populate (optionnal)
 */
  .get(notAuth, (req, res) => {
    if (!req.query.topic && !req.query.reaction) { return sendError('Topic or reaction unspecified', res, 400); }

    const q: any = {};
    if (req.query.topic) { q.topic = req.query.topic; }
    if (req.query.reaction) { q.reaction = req.query.reaction; }

    Comment.find(q)
      .then(docs => {
        if (req.query.populate && req.query.populate === 'true') {
          return Promise.all(docs.map(e => e.populate('user').populate('topic').populate('reaction').execPopulate()));
        }
        return Promise.resolve(docs);
      })
      .then(docs => sendData(res, null, docs))
      .catch(err => sendError(err, res));
  })

/**
 * POST /comment
 * Create a comment. Full permissions to admins.
 */
  .post(auth, guard.check('user'), (req, res) => {
    if (!(req.user as any).permissions.includes('admin') && (req.user as any)._id !== req.body.user) {
      return sendError('Wrong user !', res);
    }
    Comment.create(req.body, sendData_cb(res));
  });

router.route('/:id')
/**
 * GET /comment/:id
 * Send a comment
 */
  .get((req, res) => Comment
    .findById(req.params.id)
    .populate('user')
    .populate('topic')
    .populate('reaction')
    .exec(sendData_cb(res)))

/**
 * POST /comment/:id
 * Modify a comment. Full permissions to editors.
 */
  .post(auth, guard.check('user'), (req, res) => {
    if (!(req.user as any).permissions.includes('editor') && (req.user as any)._id !== req.body.user) {return sendError('Wrong user !', res, 403); }
    Comment.findById(req.params.id).then((comment: any) => {
      if (!comment) {
        return sendError('Comment does not exist !', res, 400);
      } else if (!(req.user as any).permissions.includes('editor') && (req.user as any)._id !== comment.user) {
        return sendError('Wrong user !', res, 403);
      } else {
        Object.assign(comment, req.body);
        comment.save().then(sendData_cb(res));
      }
    });
  })

/**
 * DELETE /comment/:id
 * Delete a comment. Full permissions to editors.
 */
  .delete(auth, guard.check('user'), (req, res) =>  {
    if (!(req.user as any).permissions.includes('editor') && (req.user as any)._id !== req.body.user) {
      return sendError('Wrong user !', res, 403);
    }
    Comment.findOneAndDelete({_id: req.params.id}, sendData_cb(res));
  });

export = router;
