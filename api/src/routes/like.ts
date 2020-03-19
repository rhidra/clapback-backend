import Like from '../models/LikeModel';
import {sendData, sendData_cb, sendError, sendSuccess} from '../middleware/utils';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const notAuth = jwt({secret: process.env.JWT_SECRET, credentialsRequired: false});
const guard = express_jwt_permissions();

/**
 * /like/topic
 */
router.route('/topic')
// Check if a like to a topic exists
  .get(auth, guard.check('user'), (req, res) => Like
    .findOne({topic: req.query.topic, user: (req.user as any)._id}, sendData_cb(res)))

  // Add a like to a topic
  .post(auth, guard.check('user'), (req, res) => Like
    .findOne({topic: req.body.topic, user: (req.user as any)._id}).then(duplicate => {
      if (!duplicate) {
        return Like.create({topic: req.body.topic, user: (req.user as any)._id}, sendData_cb(res));
      }
      return sendSuccess(res);
    })
  )

  // Remove a like to a topic
  .delete(auth, guard.check('user'), (req, res) => Like
    .findOne({topic: req.body.topic, user: (req.user as any)._id})
    .then(like => like.remove())
    .then(data => sendData(res, null, data))
    .catch(err => sendError(err, res, 500))
  );

/**
 * /like/reaction
 */
router.route('/reaction')
// Check if a like to a reaction exists
  .get(auth, guard.check('user'), (req, res) => Like
    .findOne({reaction: req.query.reaction, user: (req.user as any)._id}, sendData_cb(res)))

  // Add a like to a reaction
  .post(auth, guard.check('user'), (req, res) => Like
    .findOne({reaction: req.body.reaction, user: (req.user as any)._id}).then(duplicate => {
      if (!duplicate) {
        return Like.create({reaction: req.body.reaction, user: (req.user as any)._id}, sendData_cb(res));
      }
      return sendSuccess(res);
    })
  )

  // Remove a like to a reaction
  .delete(auth, guard.check('user'), (req, res) => Like
    .findOne({reaction: req.body.reaction, user: (req.user as any)._id})
    .then(like => like.remove())
    .then(data => sendData(res, null, data))
    .catch(err => sendError(err, res, 500))
  );

export = router;
