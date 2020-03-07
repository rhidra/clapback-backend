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
    .deleteOne({topic: req.body.topic, user: (req.user as any)._id}, sendData_cb(res))
  );

/*
router.route('/:id')
/**
 * GET /topic/:id
 * Retrieve a specific news topic
 * @param populate Populate the author field in each panel
 *
  .get(notAuth, (req, res) => Topic.findById(req.params.id)
    .then(topic =>  {
      if (req.query.populate && req.query.populate === 'true') {
        return topic.populate('centerPanel.author')
          .populate('leftPanel.author').populate('rightPanel.author').execPopulate();
      }
      return new Promise(r => r(topic));
    })
    .then((topic: any) => {
      if ((!req.user || !(req.user as any).permissions.includes('creator')) && !topic.approved) {
        return sendError('Unauthorized', res, 403);
      }
      return sendData(res, null, topic);
    })
  )

  // Modify a specific news topic
  .post(auth, guard.check('creator'),
    (req, res) => Topic.findOneAndUpdate({_id: req.params.id}, req.body).then((topic: any) => {
      if (!(req.user as any).permissions.includes('editor')) {
        topic.approved = false;
        topic.save();
      }
      return sendData(res, null, topic);
    }).catch(err => sendError(err, res)))

  // Delete a specific news topic
  .delete(auth, guard.check('editor'), (req, res) => Topic.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));
*/

export = router;
