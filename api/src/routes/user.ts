import * as express from 'express';
import mongoose from 'mongoose';
import {sendData, sendData_cb, sendError} from '../middleware/utils';
import User from '../models/UserModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

/**
 * GET /user
 * Send all the users
 *
 * POST /user
 * Create or edit a user
 */
router.route('/')
  .get(auth, guard.check('admin'), (req, res) => User.find({}, sendData_cb(res)))
  .post(auth, guard.check('admin'), (req, res) => User.create(req.body, sendData_cb(res)));

router.route('/:id')
  .get(auth, guard.check('user'), (req, res) => User.findById(req.params.id).then(user => {
    if (!(req.user as any).permissions.includes('admin') && (req.user as any)._id !== req.params.id) {
      return sendError('Unauthorized', res, 403);
    }
    return sendData(res, null, user);
  }))

  /**
   * POST /user/:id
   * Modify a user.
   * Only an admin can change the "permission" field.
   * Only an editor can change the "verified" and "level".
   * Users can change basic info about themselves
   */
  .post(auth, guard.check('user'), (req, res) => {
    if ((req.user as any).permissions.includes('admin')
      || (req.user as any).permissions.includes('editor')
      || (req.user as any)._id === req.params.id) {

      if (!(req.user as any).permissions.includes('admin')) {
        delete req.body.permissions;
      }
      if (!(req.user as any).permissions.includes('editor')) {
        delete req.body.verified;
        delete req.body.level;
      }
      delete req.body.password;
      delete req.body.salt;
      return User.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res));
    }
    return sendError('Unauthorized', res, 403);
  })
  .delete(auth, guard.check('admin'), (req, res) => User.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
