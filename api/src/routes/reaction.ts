import * as express from 'express';
import mongoose, {MongooseDocument} from 'mongoose';
import {sendData, sendData_cb, sendError} from '../middleware/utils';
import Reaction from '../models/ReactionModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const notAuth = jwt({secret: process.env.JWT_SECRET, credentialsRequired: false});
const guard = express_jwt_permissions();

router.route('/')

/**
 * GET /reaction
 * Send all reaction
 * @param type (mandatory) "video" for video-text reaction or "text" for text-only
 * @param populate (optionnal)
 * @param topic Id of the topic (mandatory for users)
 */
  .get(notAuth, (req, res) => {
    if (req.query.type !== 'video' && req.query.type !== 'text') { return sendError('Type wrong !', res, 400); }
    if ((!req.user || !(req.user as any).permissions.includes('creator')) && !req.query.topic) {
      return sendError('Topic unspecified', res, 400);
    }

    const q: any = {};
    if (req.query.topic) { q.topic = req.query.topic; }
    if (req.query.type === 'video') { q.$and = [{video: {$ne: null}}, {video: {$ne: ''}}];
    } else { q.$or = [{video: null}, {video: ''}]; }

    Reaction.find(q)
      .then(docs => {
        if (req.query.populate && req.query.populate === 'true') {
          return Promise.all(docs.map(e => e.populate('user').populate('topic').execPopulate()));
        }
        return Promise.resolve(docs);
      })
      .then(docs => sendData(res, null, docs))
      .catch(err => sendError(err, res));
  })

/**
 * POST /reaction
 * Create a quiz. Allowed to admins.
 */
  .post(auth, guard.check('user'), (req, res) => {
    if (!(req.user as any).permissions.includes('admin') && (req.user as any)._id !== req.body.user) {
      return sendError('Wrong user !', res);
    }
    Reaction.create(req.body, sendData_cb(res));
  });

router.route('/:id')
/**
 * GET /reaction/:id
 * Send a reaction
 */
  .get((req, res) => Reaction.findById(req.params.id).populate('user').populate('topic').exec(sendData_cb(res)))

/**
 * POST /reaction/:id
 * Modify a quiz. Allowed to editors.
 */
  .post(auth, guard.check('user'), (req, res) => {
    if (!(req.user as any).permissions.includes('editor') && (req.user as any)._id !== req.body.user) {return sendError('Wrong user !', res, 403); }
    Reaction.findById(req.params.id).then((reaction: any) => {
      if (!reaction) {
        return sendError('Reaction does not exist !', res, 400);
      } else if (!(req.user as any).permissions.includes('editor') && (req.user as any)._id !== reaction.user) {
        return sendError('Wrong user !', res, 403);
      } else {
        Object.assign(reaction, req.body);
        reaction.save().then(sendData_cb(res));
      }
    });
  })

/**
 * DELETE /reaction/:id
 * Delete a reaction. Allowed to editors.
 */
  .delete(auth, guard.check('user'), (req, res) =>  {
    if (!(req.user as any).permissions.includes('editor') && (req.user as any)._id !== req.body.user) {
      return sendError('Wrong user !', res, 403);
    }
    Reaction.findOneAndDelete({_id: req.params.id}, sendData_cb(res));
  });

export = router;
