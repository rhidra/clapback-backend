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
const unlink = util.promisify(fs.unlink);
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
router.get('/media/videos', async (req, res) => {
  const mp4: string[] = fs.readdirSync(path.join(cwd, 'public/mp4'));
  const hls: string[] = fs.readdirSync(path.join(cwd, 'public/hls'));
  const thumbnailsSize = fs.readdirSync(path.join(cwd, 'public/thumbnail'))
    .reduce((s: number, tb: string) => s + fs.statSync(path.join(cwd, 'public/thumbnail', tb)).size, 0);
  const mp4Size = mp4
    .reduce((s: number, file: string) => s + fs.statSync(path.join(cwd, 'public/mp4', file)).size, 0);
  const {stdout}: any = await exec(`du -s ${path.join(cwd, 'public/hls')} | cut -f1`);
  const hlsSize = +stdout * 1000;

  res.json({mp4, hls, mp4Size, hlsSize, thumbnailsSize});
});

/**
 * GET /admin/media/images
 * Only for admins.
 * Return infos about images and modified images stored on the server.
 * The size of all images contains the size of all modified images.
 * All size units are in bytes.
 * @return {images: [string], size: number, modifiedSize: number}
 */
router.get('/media/images', (req, res) => {
  const images: string[] = fs.readdirSync(path.join(cwd, 'public/image'));
  const size = images
    .reduce((s: number, file: string) => s + fs.statSync(path.join(cwd, 'public/image', file)).size, 0);
  const modifiedSize = images.filter(s => s.includes('_'))
    .reduce((s: number, file: string) => s + fs.statSync(path.join(cwd, 'public/image', file)).size, 0);

  return sendData(res, null, {images, size, modifiedSize});
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
router.delete('/thumbnails', async (req, res) => {
  const thumbnails = fs.readdirSync(path.join(cwd, 'public/thumbnail'));
  await Promise.all(thumbnails.map(tb => unlink(path.join(cwd, 'public/thumbnail', tb))));
  sendSuccess(res);
});

/**
 * DELETE /admin/modified-images
 * Only for admins.
 * Remove all the modified images from the disk.
 */
router.delete('/modified-images', async (req, res) => {
  const modifiedImages = fs.readdirSync(path.join(cwd, 'public/image')).filter(s => s.includes('_'));
  await Promise.all(modifiedImages.map(img => unlink(path.join(cwd, 'public/image', img))));
  sendSuccess(res);
});

/**
 * TODO: A route that check if the database if coherent
 */

export = router;
