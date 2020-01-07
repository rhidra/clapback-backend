import * as express from 'express';
import * as mongoose from 'mongoose';

export function handleError(err: mongoose.Error, res: express.Response) {
    if (err) {
        res.status(500);
        res.send(err);
    }
}

export function sendData_cb(res: express.Response, cb= (a: any) => a) {
    return (err: mongoose.Error, data: any) => {
        this.handleError(err, res);
        data = cb(data);
        res.send(data);
    };
}

export function sendData(res: express.Response, err: mongoose.Error, data: any): Promise<any> {
    return new Promise<any>(resolve => {
        this.handleError(err, res);
        res.send(data);
        resolve();
    });
}
