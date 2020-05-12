import * as express from 'express';
import mongoose from 'mongoose';
import {hasPerm, sendData, sendData_cb, sendError} from '../middleware/utils';
import Quiz from '../models/QuizModel';
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
router.route('/')
  .post(auth, guard.check('user'), (req, res) => {
    const following = req.body.following;
    let follower = hasPerm(req, 'admin') ? req.body.follower || (req.user as any)._id : (req.user as any)._id;

  });

export = router;
