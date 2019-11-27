import * as express from 'express';
import mongoose from 'mongoose';
import NewsItem from '../models/NewsItemModel';
import NewsGroup from '../models/NewsGroupModel';
import {handleError, sendData} from '../middleware/utils';

const db = mongoose.connection;
const router = express.Router();

router.route('/item')
    .get((req, res) => NewsItem.find({}, sendData(res)))
    .post((req, res) => NewsItem.create(req.body, sendData(res)));

router.route('/item/:id')
    .get((req, res) => NewsItem.findById(req.params.id, sendData(res)))
    .post((req, res) => NewsItem.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData(res)))
    .delete((req, res) => NewsItem.findOneAndDelete({_id: req.params.id}, sendData(res)));

router.route('/group')
    .get((req, res) => NewsGroup.find({}, sendData(res)))
    .post((req, res) => NewsGroup.create(req.body, sendData(res)));

router.route('/group/:id')
    .get((req, res) => NewsGroup.findById(req.params.id, (err, group: any) => {
        handleError(err, res);
        NewsItem.find({group: req.params.id}, (err2, items) => {
            handleError(err2, res);
            res.send(Object.assign({items}, group._doc));
        });
    }))
    .post((req, res) => NewsGroup.findOneAndUpdate({_id: req.params.id}, req.body, {}, sendData(res)))
    .delete((req, res) => NewsGroup.findOneAndDelete({_id: req.params.id}, sendData(res)));

export = router;
