import NewsItem from '../models/NewsItemModel';
import NewsGroup from '../models/NewsGroupModel';
import moment from 'moment';
import {handleError, sendData, sendData_cb} from '../middleware/utils';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

/**
 * /news/latest
 * Send the latest news group that is not in the future.
 */
router.route('/latest')
    .get((req, res) => NewsGroup.find({approved: true})
        .then(data => new Promise(resolve => {
            const isLatest = (ltst: any, grp: any): boolean =>
                moment(grp.date) > moment(ltst.date) && moment(grp.date) <= moment();
            const l = data.reduce((latest: any, group: any) => isLatest(latest, group) ? group : latest);
            resolve(l);
        }))
        .catch(err => handleError(err, res))
        .then((group: any) => res.redirect('/news/group/' + group.id))
    );

router.route('/item')
    .get((req, res) => NewsItem.find({}, sendData_cb(res)))
    .post(auth, guard.check([['editor'], ['admin']]), (req, res) => NewsItem.create(req.body, sendData_cb(res)));

router.route('/item/:id')
    .get((req, res) => NewsItem.findById(req.params.id, sendData_cb(res)))
    .post(auth, guard.check([['editor'], ['admin']]),
      (req, res) => NewsItem.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
    .delete(auth, guard.check([['editor'], ['admin']]),
      (req, res) => NewsItem.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

/**
 * GET /news/group?all={true|false}
 * Send all the news groups.
 * @param all add the associated news items
 *
 * POST /news/group
 * Create a news group, without the associated items.
 */
router.route('/group')
    .get((req, res) => NewsGroup.find({})
        .then(groups => !req.query.all ? new Promise(r => r(groups))
                                       : Promise.all(groups.map((group: any) => new Promise(resolve => {
                NewsItem.find({group: group._id})
                    .then(items => resolve(Object.assign({items}, group._doc)))
                    .catch(err => handleError(err, res));
            }
        ))))
        .catch(err => handleError(err, res))
        .then(groups => sendData(res, null, groups))
    )
    .post(auth, guard.check([['editor'], ['admin']]), (req, res) => NewsGroup.create(req.body, sendData_cb(res)));

/**
 * GET      /news/group/:id
 * POST     /news/group/:id
 * DELETE   /news/group/:id
 * Return, modify and delete a specific news group.
 * @param :id ID of the news group
 */
router.route('/group/:id')
    .get((req, res) => NewsGroup.findById(req.params.id, (err, group: any) => {
        handleError(err, res);
        NewsItem.find({group: req.params.id}, (err2, items) => {
            handleError(err2, res);
            res.send(Object.assign({items}, group._doc));
        });
    }))
    .post(auth, guard.check([['editor'], ['admin']]),
      (req, res) => NewsGroup.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
    .delete(auth, guard.check([['editor'], ['admin']]),
      (req, res) => NewsGroup.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
