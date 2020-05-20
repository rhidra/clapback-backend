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
  if (!follower || !following || follower === following) { return sendError('Bad parameters !', res, 400); }

  Following.findOne({user: follower}).exec()
    .then((user: any) => {
      if (!user) {
        user = new Following({user: follower});
        return user.save();
      }
      return user;
    }).then(user => {
      if (user.following.indexOf(following) === -1) {
        user.following.push(following);
        user.save();
      }
    });

  Follower.findOne({user: following}).exec()
    .then((user: any) => {
      if (!user) {
        user = new Follower({user: following});
        return user.save();
      }
      return user;
    }).then(user => {
      if (user.followers.indexOf(follower) === -1) {
        user.followers.push(follower);
        user.save();
      }
    });
  sendSuccess(res);
});

/**
 * DELETE /follow/:id
 * @param follower ID of the follower (Only for admins)
 * Unfollow a user
 */
router.delete('/:id', auth, guard.check('user'), (req, res) => {
  const followed = req.params.id;
  const follower = hasPerm(req, 'admin') ? req.query.follower || (req.user as any)._id : (req.user as any)._id;

  // TODO: Expensive operation. Put in a separate processing unit.
  Promise.all([
    Follower.findOne({user: followed}).exec().then((user: any) => {
      if (user) {
        user.followers.splice(user.followers.indexOf(follower), 1);
        return user.save();
      }
    }),
    Following.findOne({user: follower}).exec().then((user: any) => {
      if (user) {
        user.following.splice(user.following.indexOf(followed), 1);
        return user.save();
      }
    })
  ])
    .then(r => sendData(res, null, r));
});

/**
 * GET /follow/followers/:id
 * Return all the followers of a user.
 * @param populate
 * @return Follower object
 */
router.get('/followers/:id', auth, guard.check('user'), (req, res) => Follower
  .findOne({user: req.params.id})
  .then(doc => doc && req.query.populate ? doc.populate('followers').execPopulate() : doc)
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
  .then(doc => doc && req.query.populate ? doc.populate('following').execPopulate() : doc)
  .then(data => sendData(res, null, data))
);

export = router;
