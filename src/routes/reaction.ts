import * as express from 'express';
import {hasPerm, REDUCED_USER_FIELDS, sendData, sendData_cb, sendError} from '../middleware/utils';
import Reaction from '../models/ReactionModel';
import Following from '../models/FollowingModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const notAuth = jwt({secret: process.env.JWT_SECRET, credentialsRequired: false});
const guard = express_jwt_permissions();

router.route('/')

/**
 * GET /reaction
 * Send all reaction with some constraints
 * @param populate (optionnal) Populate the user field. The topic field is never populated.
 * @param isProcessing Allow videos being processed (only for admins)
 * @param topic Id of the topic constraint
 * @param user Id of the user constraint
 * @param tags Search by hashtags
 * @param userFollow Filter by the followings of a the user (used in the activity page), has priority over "user"
 * @param page Offset page
 * @param pageSize Number of elements retrieved (default: 10)
 * @param sort Sorting order (1: asc (old->new), -1: desc (new->old)) (default: asc)
 */
  .get(notAuth, async (req, res) => {
    if ((!req.user || !hasPerm(req, 'creator'))
      && !req.query.topic && !req.query.user && !req.query.tags && !req.query.userFollow) {
      return sendError('Topic, user, tags or userFollow unspecified', res, 400);
    }

    const q: any = {};

    if (req.query.topic) { q.topic = req.query.topic; }
    if (req.query.user) { q.user = req.query.user; }
    if (req.query.tags) { q.hashtags = { $all: req.query.tags }; }
    // If a user asks to include processing videos, it can only be his
    if (req.query.isProcessing) {
      if (req.user && !hasPerm(req, 'creator')) {
        q.user = (req.user as any)._id;
      }
    } else {
      q.isProcessing = false;
    }
    if (req.query.userFollow) {
      const following: any = await Following.findOne({user: req.query.userFollow}).exec();
      q.user = { $in: following ? following.following : [] };
    }

    try {
      let docs = await Reaction.find(q)
        .sort({date: +req.query.sort === -1 ? 'desc' : 'asc'})
        .skip(req.query.page * req.query.pageSize || 0)
        .limit(+req.query.pageSize || 10);

      console.log('populating');
      if (req.query.populate && req.query.populate === 'true') {
        docs = await Promise.all(docs.map(e => e.populate('user', REDUCED_USER_FIELDS).execPopulate()));
      }

      if (req.user) {
        docs = await Promise.all(docs.map((doc: any) => doc.addHasLiked((req.user as any)._id)));
      }

      sendData(res, null, docs);
    } catch (err) {
      console.error(err);
      sendError(err, res);
    }
  })

/**
 * POST /reaction
 * Create a clapback. Full permissions to admins.
 */
  .post(auth, guard.check('user'), async (req, res) => {
    try {
      if (!hasPerm(req, 'admin') && (req.user as any)._id !== req.body.user) {
        return sendError('Wrong user !', res);
      }
      const reaction: any = await Reaction.create(req.body);
      reaction.isPublic = true;
      reaction.isProcessing = !await reaction.isProcessed();
      await reaction.save();
      await sendData(res, null, reaction);
    } catch (err) {
      sendError(err, res, 400);
    }
  });

router.route('/:id')
/**
 * GET /reaction/:id
 * Send a reaction
 */
  .get(notAuth, (req, res) => Reaction
    .findById(req.params.id)
    .populate('user', REDUCED_USER_FIELDS)
    .exec()
    .then((doc: any) => req.user ? doc.addHasLiked((req.user as any)._id) : doc)
    .then(doc => sendData(res, null, doc)))

/**
 * POST /reaction/:id
 * Modify a reaction. Allowed to editors.
 */
  .post(auth, guard.check('user'), async (req, res) => {
    if (!hasPerm(req, 'editor') && (req.user as any)._id !== req.body.user) {
      return sendError('Wrong user !', res, 403);
    }
    const reaction: any = await Reaction.findById(req.params.id);
    if (!reaction) {
      return sendError('Reaction does not exist !', res, 400);
    } else if (!hasPerm(req, 'editor') && (req.user as any)._id !== reaction.user) {
      return sendError('Wrong user !', res, 403);
    } else {
      Object.assign(reaction, req.body);
      reaction.isProcessing = !await reaction.isProcessed();
      try {
        const data: any = await reaction.save();
        return sendData(res, null, data);
      } catch (err) {
        return sendError(err, res);
      }
    }
  })

/**
 * DELETE /reaction/:id
 * Delete a reaction. Allowed to editors.
 */
  .delete(auth, guard.check('user'), (req, res) =>  {
    if (!hasPerm(req, 'editor') && (req.user as any)._id !== req.body.user) {
      return sendError('Wrong user !', res, 403);
    }
    Reaction.findOneAndDelete({_id: req.params.id}, sendData_cb(res));
  });

export = router;
