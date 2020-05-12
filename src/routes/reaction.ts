import * as express from 'express';
import mongoose from 'mongoose';
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
 * @param populate (optionnal) Populate the user field. The topic field is never populated.
 * @param topic Id of the topic
 * @param tags Search by hashtags
 * @param user Id of the user
 */
  .get(notAuth, (req, res) => {
    if ((!req.user || !(req.user as any).permissions.includes('creator'))
      && !req.query.topic && !req.query.user && !req.query.tags) {
      return sendError('Topic unspecified', res, 400);
    }

    const q: any = {};
    if (req.query.topic) { q.topic = req.query.topic; }
    if (req.query.user) { q.user = req.query.user; }
    if (req.query.tags) { q.hashtags = { $all: req.query.tags }; }

    Reaction.find(q)
      .then(docs => {
        if (req.query.populate && req.query.populate === 'true') {
          return Promise.all(docs.map(e => e.populate('user').execPopulate()));
        }
        return Promise.resolve(docs);
      })
      .then(docs => req.user
        ? Promise.all(docs.map((doc: any) => doc.addHasLiked((req.user as any)._id))) : Promise.resolve(docs))
      .then(docs => sendData(res, null, docs))
      .catch(err => sendError(err, res));
  })

/**
 * POST /reaction
 * Create a clapback. Full permissions to admins.
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
  .get(notAuth, (req, res) => Reaction
    .findById(req.params.id)
    .populate('user')
    .exec()
    .then((doc: any) => req.user ? doc.addHasLiked((req.user as any)._id) : Promise.resolve(doc))
    .then(doc => sendData(res, null, doc)))

/**
 * POST /reaction/:id
 * Modify a reaction. Allowed to editors.
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
        reaction.save()
          .then((data: any) => sendData(res, null, data))
          .catch((err: any) => sendError(err, res));
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
