import upload from '../middleware/upload';
import fs from 'fs';
import Jimp from 'jimp';
import uuidv4 from 'uuid/v4';
import {
  buildPath, clamp, getExtension, sendError, sendSuccess, fileExists,
  devOnly, isVideoProcessed, sendData} from '../middleware/utils';
import * as path from 'path';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router, Request, Response} from 'express';
import {VideoEncodingQueue} from '../middleware/queue';
import Reaction from '../models/ReactionModel';
import Topic from '../models/TopicModel';
import genThumbnail from 'simple-thumbnail';
import ffmpeg from 'ffmpeg-static';
import PendingMedia from '../models/PendingMediaModel';

fs.mkdirSync('public/mp4', {recursive: true});
fs.mkdirSync('public/hls', {recursive: true});
fs.mkdirSync('public/thumbnail', {recursive: true});
fs.mkdirSync('public/image', {recursive: true});


const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

const videoQueue = new VideoEncodingQueue();
videoQueue.registerOut(updateProcessingState);

// Media file supported format
const supportedImages = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif'];

class ImageOptions {
  quality: number;
  width: number;
  height: number;
}

function extractOptions(req: Request): [ImageOptions, boolean] {
  const opt = new ImageOptions();
  opt.quality = +req.query.quality ? clamp(+req.query.quality, 0, 100) : undefined;
  opt.width = +req.query.width ? clamp(+req.query.width, 0) : undefined;
  opt.height = +req.query.height ? clamp(+req.query.height, 0) : undefined;
  const thumbnail = 'thumbnail' in req.query;
  return [opt, thumbnail];
}

// Parse abcd-1234-EF56-tre0_q100_w450_h200.png
function parseFilename(uri: string): [string, string, ImageOptions, string] {
  const imgReg = /^([a-zA-Z0-9\/\-]*)(_q1?[0-9]?[0-9])?(_w[0-9]+)?(_h[0-9]+)?\.(.*)$/;
  const [fullname, fileId, q, w, h, ext] = imgReg.exec(uri);

  const opt = new ImageOptions();
  opt.quality = q ? clamp(+q.slice(2), 0, 100) : undefined;
  opt.width = w ? clamp(+w.slice(2), 0) : undefined;
  opt.height = h ? clamp(+h.slice(2), 0) : undefined;

  return [fullname, ext.toLowerCase(), opt, fileId];
}

async function modifyImage(image: any, filename: string, opt: ImageOptions, out?: string) {
    let img = await Jimp.read(image);
    img = img.quality(opt.quality ? opt.quality : 100);
    img = img.resize(opt.width ? opt.width : (opt.height ? Jimp.AUTO : img.bitmap.width),
                     opt.height ? (opt.width ? Jimp.AUTO : opt.height) : Jimp.AUTO);
    if (opt.width && opt.height) {
      img = img.crop((img.bitmap.width - opt.width) / 2, (img.bitmap.height - opt.height) / 2, opt.width, opt.height);
    }
    return new Promise(r => img.write(out ? out : 'public/image/' + filename, r));
}

/** MEDIA SERVER
 *
 * POST /media/alloc/:filename.mp4
 * Allocate a filename to use as an uploaded file.
 *
 * POST /media?quality=??&width=??&height=??
 * @body {filename}
 * Upload a single file and return the url path, and change the quality and size.
 * The body should contain a filename generated with POST /media/alloc/:filename
 *
 * GET /media/image/:fileid_q??_w??_h??.jpg
 * Return an image. The q, w and h parameters to specify the quality, width and height are optionals.
 * The image is modified once and then a cached version is used.
 *
 * GET /media/video/:fileid/mp4
 * Return a MP4 video file. Deprecated.
 *
 * GET /media/video/:fileid/hls
 * Return a HLS master playlist (master.m3u8). Used by HLS streaming player.
 *
 * GET /media/video/:fileid_q??_w??_h??/thb
 * Return the thumbnail of a video. The thumbnail of the video can be modified
 * by the image parameters q, w and h. The original thumbnail is created only once for each video.
 *
 * DELETE /media/image/:filename
 * Delete an image file on the disk
 *
 * DELETE /media/video/:filename/mp4
 * Delete an MP4 file on the disk
 *
 * DELETE /media/video/:filename/hls
 * Delete a group of HLS streaming files on the disk
 *
 * All media files are stored in public/ folder, in either images/, hls/ or mp4/.
 * When thumbnails are generated, they are moved to /thumbnail folder.
 */

router.post('/alloc/:filename', auth, async (req, res) => {
  const ext = getExtension(req.params.filename);
  const fileId = `${uuidv4()}`;

  if (supportedImages.includes(ext)) {
    const media: any = new PendingMedia({filename: `${fileId}.${ext}`});
    await media.save();
    sendData(res, null, {filename: media.filename});
  } else if (ext === 'mp4') {
    const media: any = new PendingMedia({filename: fileId});
    await media.save();
    sendData(res, null, {filename: fileId});
  } else {
    sendError('File format unsupported !', res);
  }
});

router.post('/', auth, upload.single('media'), async (req, res) => {
  if (!req.file) {
    return sendError('No media received !', res, 400);
  } else if (!req.body.filename) {
    return sendError('No file name received !', res, 400);
  }
  let fileRef: any = await PendingMedia.findOne({filename: req.body.filename});
  if (!fileRef || !fileRef.filename) {
    return sendError('The file name does not exists !', res, 400);
  }
  fileRef = fileRef.filename;

  const ext = getExtension(req.file.originalname);
  const [opt, _] = extractOptions(req);

  if (supportedImages.includes(ext)) {
    await modifyImage(req.file.buffer, fileRef, opt);
    sendSuccess(res);
  } else if (ext === 'mp4') {
    const fileMP4Path = `public/mp4/${fileRef}.${ext}`;
    fs.writeFileSync(fileMP4Path, req.file.buffer);

    videoQueue.addToQueue(fileRef, fileMP4Path);
    sendSuccess(res);
  } else {
    sendError('File format unsupported !', res, 400);
  }
});

router.route('/image/:filename')
  .get(async (req, res) => {
    const [fullname, ext, opt, fileId] = parseFilename(req.params.filename);
    const originalFile = 'public/image/' + fileId + '.' + ext;
    const sentFile = 'public/image/' + fullname;

    if (!supportedImages.includes(ext)) {
      return sendError('File format unsupported !', res, 400);
    }

    if (process.env.NODE_ENV === 'production') {
      if (await fileExists(originalFile)) {
        await modifyImage(originalFile, fullname, opt);
        await res.sendFile(path.join(process.cwd(), sentFile));
      } else {
        sendError('File does not exists', res, 400);
      }

    } else {
      if (!await fileExists(sentFile)) {
        await modifyImage(originalFile, fullname, opt);
      }
      await res.sendFile(path.join(process.cwd(), sentFile));
    }
  })

  .delete(auth, guard.check('admin'), (req, res) => {
    fs.unlinkSync(buildPath(req.params.filename));
    sendSuccess(res);
  });

router.get('/video/:fileid/thb', async (req: Request, res: Response) => {
  const [fullname, _, opt, fileId] = parseFilename(req.params.fileid + '.png');
  const originalFile = 'public/thumbnail/' + fileId + '.png';
  const sentFile = 'public/thumbnail/' + fullname;

  // Generate the thumbnail if it doesn't exist
  if (!await fileExists(originalFile)) {
    const tbPath = path.join(process.cwd(), originalFile);
    const fileMP4Path = path.join(process.cwd(), 'public/mp4', fileId + '.mp4');
    if (await fileExists(`public/mp4/${fileId}.mp4`)) {
      await genThumbnail(fileMP4Path, tbPath, '150x?', {path: ffmpeg});
    } else {
      await genThumbnail(`${process.env.HOST_URL}/media/video/${fileId}/hls`, tbPath, '150x?', {path: ffmpeg});
    }
  }

  // Modify the image if required
  if (process.env.NODE_ENV === 'production' || !await fileExists(sentFile)) {
    await modifyImage(originalFile, fullname, opt, sentFile);
  }
  await res.sendFile(path.join(process.cwd(), sentFile));
});

router.get('/video/:fileid/mp4', devOnly, async (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public/mp4', req.params.fileid + '.mp4'));
});

router.get('/video/:fileid/hls', devOnly, async (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public/hls', req.params.fileid, 'master.m3u8'));
});

router.get('/video/:fileid/stream_:v.m3u8', devOnly, async (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public/hls', req.params.fileid, 'stream_' + req.params.v + '.m3u8'));
});

router.get('/video/:fileid/stream_:v/data_:seg.ts', devOnly, async (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public/hls', req.params.fileid, 'stream_' + req.params.v,
    'data_' + req.params.seg + '.ts'));
});

router.delete('/video/:fileid/mp4', auth, guard.check('admin'), (req: Request, res: Response) => {
  fs.unlinkSync(path.join(process.cwd(), 'public/mp4', `${req.params.fileid}.mp4`));
  sendSuccess(res);
});

router.delete('/video/:fileid/hls', auth, guard.check('admin'), (req: Request, res: Response) => {
  fs.rmdirSync(path.join(process.cwd(), 'public/hls', req.params.fileid), {recursive: true});
  sendSuccess(res);
});

/**
 * After a video has been processed, this function is asynchronously called
 * by the message queue to update the set of the database.
 * It sets the potential topic or reaction linked to this video to the appropriate status.
 * ACK is sent if the promise is successful, NACK if the promise rejects.
 */
function updateProcessingState(data: { fileId: string }) {
  return new Promise(async (resolve, reject) => {
    const query = RegExp(`.*${data.fileId}.*`);

    const ok = !!(await Reaction.updateOne({video: query}, {isProcessing: false})).n;
    if (ok) {
      console.log(`Updated the database for ${data.fileId}`);
      return resolve();
    }

    const topicQuery = {$or: [{'centerPanel.video': query}, {'leftPanel.video': query}, {'rightPanel.video': query}]};
    const topic: any = await Topic.findOne(topicQuery);

    if (!topic) {
      // TODO: Integrate this error to Sentry
      setTimeout(() => reject(), 1000);
      console.error('No object corresponding to the video file ID !');
    } else if (await topic.isProcessed()) {
      topic.isProcessing = false;
      await topic.save();
      console.log(`Updated the database for ${data.fileId}`);
      resolve();
    }
  });
}

process.on('SIGINT', () => {
  videoQueue.onShutdown();
  process.exit(0);
});

export = router;
