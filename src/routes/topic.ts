import Topic from '../models/TopicModel';
import {hasPerm, REDUCED_USER_FIELDS, sendData, sendData_cb, sendError} from '../middleware/utils';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';
import moment from 'moment';

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
    .find((req.query.approved && req.query.approved === 'true') || !req.user || !hasPerm(req, 'creator')
                    ? {status: 'approved', date: {$lte: moment().toISOString()}} : {})
    .sort({date: 'desc'})
    .then(docs => {
      if (req.query.populate && req.query.populate === 'true') {
        return Promise.all(docs.map(e => e.populate('centerPanel.author', REDUCED_USER_FIELDS)
          .populate('leftPanel.author', REDUCED_USER_FIELDS)
          .populate('rightPanel.author', REDUCED_USER_FIELDS).execPopulate()));
      }
      return Promise.resolve(docs);
    })
    .then(docs => req.user
      ? Promise.all(docs.map((doc: any) => doc.addHasLiked((req.user as any)._id))) : Promise.resolve(docs))
    .then(docs => sendData(res, null, docs))
  )

  /**
   * POST /topic/
   * Create a news topic
   */
  .post(auth, guard.check('creator'), async (req, res) => {
    try {
      if (!hasPerm(req, 'editor')) {
        const topic = await Topic.create(req.body);
        topic.save();
        await sendData(res, null, topic);
      } else {
        sendError('Unauthorized', res, 403);
      }
    } catch (err) {
      sendError(err, res, 400);
    }
  });

router.route('/:id')
/**
 * GET /topic/:id
 * Retrieve a specific news topic
 * @param populate Populate the author field in each panel
 */
  .get(notAuth, (req, res) => Topic.findById(req.params.id)
    .then(topic =>  {
      if (req.query.populate && req.query.populate === 'true') {
        return topic.populate('centerPanel.author', REDUCED_USER_FIELDS)
          .populate('leftPanel.author', REDUCED_USER_FIELDS)
          .populate('rightPanel.author', REDUCED_USER_FIELDS).execPopulate();
      }
      return new Promise(r => r(topic));
    })
    .then((doc: any) => req.user ? doc.addHasLiked((req.user as any)._id) : Promise.resolve(doc))
    .then((topic: any) => {
      if ((!req.user || !hasPerm(req, 'creator')) && topic.status !== 'approved') {
        return sendError('Unauthorized', res, 403);
      }
      return sendData(res, null, topic);
    })
  )

  // Modify a specific news topic
  .post(auth, guard.check('creator'),
    (req, res) => Topic.findOneAndUpdate({_id: req.params.id}, req.body).then((topic: any) => {
      if (!hasPerm(req, 'editor')) {
        topic.status = 'private';
        topic.save();
      }
      return sendData(res, null, topic);
    }).catch(err => sendError(err, res)))

  // Delete a specific news topic
  .delete(auth, guard.check('editor'), (req, res) => Topic.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
