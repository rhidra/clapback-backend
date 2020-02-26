import * as express from 'express';
import mongoose from 'mongoose';
import {sendData, sendData_cb} from '../middleware/utils';
import User from '../models/UserModel';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';

const db = mongoose.connection;
const router = express.Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

/**
 * GET /user?query=...
 * Send all the users
 * @param all add the associated news items
 *
 * POST /user
 * Create or edit a user
 */
router.use(auth, guard.check('admin'));
router.route('/')
  .get((req, res) => !req.query.query ? User.find({}, sendData_cb(res)) : sendData(res, null, []))
  .post((req, res) => User.create(req.body, sendData_cb(res)));

router.route('/:id')
  .get((req, res) => User.findById(req.params.id, sendData_cb(res)))
  .post((req, res) => User.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
  .delete((req, res) => User.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
