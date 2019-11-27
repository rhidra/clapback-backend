import * as express from 'express';
import * as mongoose from 'mongoose';

export function handleError(err: mongoose.Error, res: express.Response) {
    if (err) {
        res.status(500);
        res.send(err);
    }
}

export function sendData(res: express.Response) {
    return (err: mongoose.Error, data: any) => {
        this.handleError(err, res);
        res.send(data);
    };
}
