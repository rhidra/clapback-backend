import Topic from '../models/TopicModel';
import {sendData, sendData_cb, sendError} from '../middleware/utils';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const notAuth = jwt({secret: process.env.JWT_SECRET, credentialsRequired: false});
const guard = express_jwt_permissions();

router.route('/')

  /**
   * GET /topic/
   * Retrieves all news topic
   * @param approved Only approved topics
   * @param populate Populate the author fields in each panel
   */
  .get(notAuth, (req, res) => Topic
    .find(req.query.approved || !req.user || !(req.user as any).permissions.includes('creator') ? {approved: true} : {})
    .sort({date: 'desc'})
    .then(docs => {
      if (req.query.populate) {
        return Promise.all(docs.map(e => e.populate('centerPanel.author')
          .populate('leftPanel.author').populate('rightPanel.author').execPopulate()));
      }
      return new Promise(r => r(docs));
    })
    .then(docs => sendData(res, null, docs)))

  // Create a news topic
  .post(auth, guard.check('creator'), (req, res) => Topic.create(req.body).then((topic: any) => {
    if (!(req.user as any).permissions.includes('editor')) {
      topic.approved = false;
      topic.save();
    }
    return sendData(res, null, topic);
  }).catch(err => sendError(err, res)));

router.route('/:id')
  // Retrieve a specific news topic
  .get(notAuth, (req, res) => Topic.findById(req.params.id).then((topic: any) => {
    if ((!req.user || !(req.user as any).permissions.includes('creator')) && !topic.approved) {
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
    }).catch(err => sendError(err, res)))

  // Delete a specific news topic
  .delete(auth, guard.check('editor'), (req, res) => Topic.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;