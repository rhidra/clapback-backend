import * as express from 'express';
import mongoose from 'mongoose';
import NewsItem from '../models/NewsItemModel';
import NewsGroup from '../models/NewsGroupModel';
import moment from 'moment';
import {handleError, sendData, sendData_cb} from '../middleware/utils';

const db = mongoose.connection;
const router = express.Router();

/** /news/latest
 * Send the latest news group that is not in the future.
 */
router.route('/latest')
    .get((req, res) => NewsGroup.find({})
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
    .post((req, res) => NewsItem.create(req.body, sendData_cb(res)));

router.route('/item/:id')
    .get((req, res) => NewsItem.findById(req.params.id, sendData_cb(res)))
    .post((req, res) => NewsItem.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
    .delete((req, res) => NewsItem.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

router.route('/group')
    .get((req, res) => NewsGroup.find({}, sendData_cb(res)))
    .post((req, res) => NewsGroup.create(req.body, sendData_cb(res)));

router.route('/group/:id')
    .get((req, res) => NewsGroup.findById(req.params.id, (err, group: any) => {
        handleError(err, res);
        NewsItem.find({group: req.params.id}, (err2, items) => {
            handleError(err2, res);
            res.send(Object.assign({items}, group._doc));
        });
    }))
    .post((req, res) => NewsGroup.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData_cb(res)))
    .delete((req, res) => NewsGroup.findOneAndDelete({_id: req.params.id}, sendData_cb(res)));

export = router;
