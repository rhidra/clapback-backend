import fs from 'fs';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';
import * as path from 'path';
import {sendData, sendSuccess} from '../middleware/utils';
import check from 'check-disk-space';
import util from 'util';
import { exec as exec_ } from 'child_process';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();
const exec = util.promisify(exec_);
const cwd: string = process.cwd();

/*** ROUTES ONLY FOR ADMINS ! ***/
router.use(auth, guard.check('admin'));

/**
 * GET /admin/media/videos
 * Only for admins.
 * Return infos on videos stored on the server.
 * All size units are in bytes.
 * @return {mp4: [string], hls: [string], mp4Size, hlsSize, thumbnailsSize}
 */
router.get('/media/videos', (req, res) => {
  const mp4: string[] = fs.readdirSync(path.join(cwd, 'public/mp4'));
  const hls: string[] = fs.readdirSync(path.join(cwd, 'public/hls'));
  const thumbnailsSize = fs.readdirSync(path.join(cwd, 'public/thumbnail'))
    .reduce((s: number, tb: string) => s + fs.statSync(path.join(cwd, 'public/thumbnail', tb)).size, 0);
  const mp4Size = mp4
    .reduce((s: number, file: string) => s + fs.statSync(path.join(cwd, 'public/mp4', file)).size, 0);
  const {stdout}: any = exec(`du -s ${path.join(cwd, 'public/hls')} | cut -f1`);
  const hlsSize = +stdout;

  res.json({mp4, hls, mp4Size, hlsSize, thumbnailsSize});
});

/**
 * GET /admin/media/images
 * Only for admins.
 * Return infos about images stored on the server.
 * All size units are in bytes.
 * @return {images: [string], size: number}
 */
router.get('/media/images', (req, res) => {
  const images: string[] = fs.readdirSync(path.join(cwd, 'public/images'));
  const size = images
    .reduce((s: number, file: string) => s + fs.statSync(path.join(cwd, 'public/images', file)).size, 0);

  return sendData(res, null, {images, size});
});

/**
 * GET /admin/storage
 * Only for admins.
 * Monitor storage space on the server.
 * @return {total, used} in Gigabytes
 */
router.get('/storage', (req, res) => {
  check('/').then(stat => {
    res.json({total: stat.size / 1e9, used: (stat.size - stat.free) / 1e9});
  });
});

/**
 * DELETE /admin/thumbnails
 * Only for admins.
 * Remove all the thumbnail cache from the disk.
 */
router.delete('/thumbnails', (req, res) => {
  Promise
    .all(fs.readdirSync(path.join(cwd, 'public/thumbnail')).map(tb => new Promise(resolve =>
      fs.unlink(path.join(cwd, 'public/thumbnail', tb), () => resolve())
    )))
    .then(() => sendSuccess(res));
});

/**
 * TODO: A route that check if the database if coherent
 */

export = router;
