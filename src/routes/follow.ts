import * as express from 'express';
import mongoose from 'mongoose';
import {hasPerm, sendData, sendData_cb, sendError, sendSuccess} from '../middleware/utils';
import Following from '../models/FollowingModel';
import Follower from '../models/FollowerModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

/**
 * POST /follow
 * Follow a user. The follower ID is extracted from the header.
 * Specifying the ID of the follower in the body is possible but only for admins.
 * @body {following: user which is followed, follower: (optionnal)}
 */
router.post('/', auth, guard.check('user'), (req, res) => {
  const following = req.body.following;
  const follower = hasPerm(req, 'admin') ? req.body.follower || (req.user as any)._id : (req.user as any)._id;
  if (!follower || !following) { return sendError('Bad parameters !', res, 400); }

  Following.findOne({user: follower}).then((user: any) => {
    console.log('following', user);
    if (!user) {
      user = new Following({user: follower});
      user.save();
    }
    if (user.following.indexOf(following) === -1) {
      user.following.push(following);
    }
  });

  Follower.findOne({user: following}).then((user: any) => {
    console.log('followers', user);
    if (!user) {
      user = new Follower({user: following});
      user.save();
    }
    if (user.followers.indexOf(follower) === -1) {
      user.followers.push(follower);
    }
  });
  sendSuccess(res);
});

/**
 * GET /follow/followers/:id
 * Return all the followers of a user.
 * @param populate
 * @return Follower object
 */
router.get('/followers/:id', auth, guard.check('user'), (req, res) => Follower
  .findOne({user: req.params.id})
  .then(doc => req.query.populate ? doc.populate('followers').execPopulate() : doc)
  .then(data => sendData(res, null, data))
);

/**
 * GET /follow/following/:id
 * Return all the people followed by a user.
 * @param populate
 * @return Following object
 */
router.get('/following/:id', auth, guard.check('user'), (req, res) => Following
  .findOne({user: req.params.id})
  .then(doc => req.query.populate ? doc.populate('following').execPopulate() : doc)
  .then(data => sendData(res, null, data))
);

export = router;
