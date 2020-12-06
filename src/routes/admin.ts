import fs from 'fs';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';
import * as path from 'path';
import {sendData, sendSuccess} from '../middleware/utils';
import check from 'check-disk-space';
import util from 'util';
import { exec as exec_ } from 'child_process';
import Reaction from '../models/ReactionModel';
import Topic from '../models/TopicModel';
import User from '../models/UserModel';

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
 * GET /admin/db-check
 * Only for admins.
 * Check for incoherences between media files and the DB.
 */
router.get('/db-check', async (req, res) => {
  const hls: string[] = fs.readdirSync(path.join(cwd, 'public/hls'));
  const mp4: string[] = fs.readdirSync(path.join(cwd, 'public/mp4'));
  const images: string[] = fs.readdirSync(path.join(cwd, 'public/image')).filter(s => !s.includes('_'));
  const unlinkedHLS: string[] = [];
  const unlinkedMP4: string[] = [];
  const unlinkedImages: string[] = [];
  const unlinkedTopics: any[] = [];
  const unlinkedReactions: any[] = [];
  const unlinkedUsers: any[] = [];

  const checkHLS = (fileId: string) => fs.existsSync(path.join(cwd, 'public/hls', fileId, 'master.m3u8'));
  const checkImg = (filename: string) => fs.existsSync(path.join(cwd, 'public/image', filename));

  // Check for HLS files not linked to the DB
  console.log('Check HLS files');
  hls.forEach(async fileId => {
    const query = RegExp(`.*${fileId}.*`);
    let obj = await Reaction.findOne({video: query});
    if (!obj) {
      obj = await Topic.findOne({$or: [
        {'centerPanel.video': query}, {'leftPanel.video': query}, {'rightPanel.video': query}
      ]});
    }

    if (!obj) {
      unlinkedHLS.push(fileId);
    }
  });

  // Check for MP4 files not linked to HLS
  console.log('Check MP4 files');
  mp4.forEach(filename => checkHLS(filename.slice(0, -4)) ? null : unlinkedMP4.push(filename.slice(0, -4)));

  // Check for images not linked to any topic or user
  console.log('Check image files');
  images.forEach(async filename => {
    let obj = await User.findOne({image: filename});
    if (!obj) {
      obj = await Topic.findOne({$or: [{'leftPanel.image': filename}, {'rightPanel.image': filename}]});
    }

    if (!obj) {
      unlinkedImages.push(filename);
    }
  });

  // Check for topics without valid videos or images
  console.log('Check Topics');
  for await (const topic of (Topic.find() as any)) {
    if ((topic.centerPanel.video && !checkHLS(topic.centerPanel.video))
        || (topic.leftPanel.video && !checkHLS(topic.leftPanel.video))
        || (topic.rightPanel.video && !checkHLS(topic.rightPanel.video))
        || (topic.leftPanel.image && !checkImg(topic.leftPanel.image))
        || (topic.rightPanel.image && !checkImg(topic.rightPanel.image))) {
      unlinkedTopics.push(topic);
    }
  }

  // Check for reactions without valid videos
  console.log('Check Reactions');
  for await (const reaction of (Reaction.find() as any)) {
    if (!reaction.video || !checkHLS(reaction.video)) {
      unlinkedReactions.push(reaction);
    }
  }

  // Check for users without valid images
  console.log('Check Users');
  for await (const user of (User.find() as any)) {
    if (user.image && !checkImg(user.image)) {
      unlinkedUsers.push(user);
    }
  }

  console.log('Checking DB done !');
  return sendData(res, null, {unlinkedHLS, unlinkedMP4, unlinkedImages,
    unlinkedTopics, unlinkedReactions, unlinkedUsers});
});

export = router;
