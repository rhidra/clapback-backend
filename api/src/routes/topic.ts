import Topic from '../models/TopicModel';
import {handleError, sendData, sendData_cb, sendError} from '../middleware/utils';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const notAuth = jwt({secret: process.env.JWT_SECRET, credentialsRequired: false});
const guard = express_jwt_permissions();

router.route('/')
  // Retrieve news topics
  .get(notAuth, (req, res) =>
    Topic.find({approved: req.query.approved || !req.user || !(req.user as any).permissions.include('creator')},
      sendData_cb(res)).sort({date: 'asc'}))

  // Create a news topic
  .post(auth, guard.check('creator'), (req, res) => Topic.create(req.body).then((topic: any) => {
    if (!(req.user as any).permissions.includes('editor')) {
      topic.approved = false;
      topic.save();
    }
    return sendData(res, null, topic);
  }));

router.route('/:id')
  // Retrieve a specific news topic
  .get(notAuth, (req, res) => Topic.findById(req.params.id).then((topic: any) => {
    if ((!req.user || !(req.user as any).permissions.include('creator')) && !topic.approved) {
      return sendError('Unauthorized', res, 403);
    }
    return sendData(res, null, topic);
  }))

  // Modify a specific news topic
  .post(auth, guard.check('creator'),
    (req, res) => Topic.findOneAndUpdate({_id: req.params.id}, req.body).then((topic: any) => {
      if (!(req.user as any).permissions.includes('editor')) {
        topic.approved = false;
        topic.save();
      }
      return sendData(res, null, topic);
    }))

  // Delete a specific news topic
  .delete(auth, guard.check('editor'), (req, res) => Topic.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
