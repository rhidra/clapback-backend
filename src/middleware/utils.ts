import * as express from 'express';
import * as mongoose from 'mongoose';
import crypto from 'crypto';

/* ROUTING PATH */
export function handleError(err: mongoose.Error | any, res?: express.Response, errorCode: number = 500) {
  if (err && res) {
    res.status(errorCode);
    res.send(err);
  } else if (err) {
    console.error(err);
  }
  return !!err;
}

export function sendData_cb(res: express.Response, cb = (a: any) => a) {
  return (err: mongoose.Error, data: any = {}) => {
    if (!this.handleError(err, res)) {
      data = cb(data);
      res.send(data);
    }
  };
}

export function sendData(res: express.Response, err: mongoose.Error, data: any): Promise<any> {
  return new Promise<any>(resolve => {
    if (!this.handleError(err, res)) {
      res.send(data);
      resolve();
    }
  });
}

export function sendSuccess(res: express.Response): Promise<any> {
  return new Promise<any>(resolve => {
    res.send({status: 'success'});
    resolve();
  });
}

export function sendError(err: string, res: express.Response, errorCode: number = 500): Promise<any> {
  return new Promise<any>(resolve => {
    handleError({status: 'error', error: err}, res, errorCode);
  });
}

/* MODELS */
export function addHasLiked(doc: any, modelType: string, userId: string): Promise<any> {
  const json: any = doc.toJSON();
  const query: any = {user: userId};
  query[modelType] = doc._id;
  return mongoose
    .model('Like')
    .findOne(query).exec()
    .then((like: any) => {
      if (like) {
        json.hasLiked = true;
        return Promise.resolve(json);
      }
      return Promise.resolve(doc);
    })
    .catch(err => console.log('erreur', err));
}

/* AUTHENTICATION */
export function hash(data: string): string {
  const h = crypto.createHash('sha256');
  h.update(data);
  return h.digest('hex');
}

export function hasPerm(req: any, perm: string) {
  return req.user.permissions.includes(perm);
}

/* MEDIA SERVER */
export function buildModifiedFilename(filename: string, opt: any, extension: string = getExtension(filename)) {
  return getFilename(filename)
    + (opt.quality ? '_q' + opt.quality : '')
    + (opt.width ? '_w' + opt.width : '')
    + (opt.height ? '_h' + opt.height : '')
    + '.' + extension;
}

export function buildPath(filename: string): string {
  return 'public/media/' + filename;
}

export function buildUrl(filename: string): string {
  return '/media/' + filename;
}

export function getFilename(filename: string): string {
  const ext = getExtension(filename);
  return ext ? filename.substring(0, filename.length - getExtension(filename).length - 1) : undefined;
}

export function getExtension(filename: string): string {
  const ext = /(?:\.([^.]+))?$/.exec(filename)[1];
  return ext ? ext.toLowerCase() : ext;
}

/* MATH */
export function clamp(n: number, min: number, max?: number) {
  return max ? Math.min(Math.max(n, min), max) : Math.max(n, min);
}
