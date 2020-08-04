import upload from '../middleware/upload';
import fs from 'fs';
import Jimp from 'jimp';
import uuidv4 from 'uuid/v4';
import {buildModifiedFilename, buildPath, buildUrl, clamp, getExtension, sendError, sendSuccess, fileExists,
  devOnly} from '../middleware/utils';
import * as path from 'path';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router, Request, Response} from 'express';
// tslint:disable-next-line:no-var-requires
const genThumbnail = require('simple-thumbnail');
// tslint:disable-next-line:no-var-requires
const ffmpeg = require('ffmpeg-static');
import {spawn, exec} from 'child_process';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

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
function parseFilename(uri: string): [string, string, ImageOptions, string, boolean] {
  const imgReg = /^([a-zA-Z0-9\/\-]*)(_q1?[0-9]?[0-9])?(_w[0-9]+)?(_h[0-9]+)?\.(.*)$/;
  const [fullname, fileId, q, w, h, ext] = imgReg.exec(uri);

  const opt = new ImageOptions();
  opt.quality = q ? clamp(+q.slice(2), 0, 100) : undefined;
  opt.width = w ? clamp(+w.slice(2), 0) : undefined;
  opt.height = h ? clamp(+h.slice(2), 0) : undefined;

  return [fullname, ext.toLowerCase(), opt, fileId, false];
}

function modifyImage(image: any, filename: string, opt: ImageOptions, out?: string) {
  return Jimp.read(image).then(img => new Promise(r => {
    img = img.quality(opt.quality ? opt.quality : 100)
      .resize(opt.width ? opt.width : (opt.height ? Jimp.AUTO : img.bitmap.width),
        opt.height ? (opt.width ? Jimp.AUTO : opt.height) : Jimp.AUTO);
    if (opt.width && opt.height) {
      img = img.crop((img.bitmap.width - opt.width) / 2, (img.bitmap.height - opt.height) / 2, opt.width, opt.height);
    }
    img.write(out ? out : buildPath(filename), r);
  }));
}

/** MEDIA SERVER
 *
 * POST /media?quality=**&width=**&height=**
 * Upload a single file and return the url path, and change the quality and size.
 *
 * GET /media/:filename?quality=**&width=**&height=**&thumbnail
 * Return the file data with the quality and size requested.
 * If the file is a video, the thumbnail parameter returns an image thumbnail.
 *
 * DELETE /media/:filename
 * Delete a file on the disk
 */

router.post('/', auth, upload.single('media'), async (req, res) => {
  if (!req.file) {
    sendError('No media received !', res);
  }
  const ext = getExtension(req.file.originalname);
  const [opt, _] = extractOptions(req);
  const fileId = `${uuidv4()}`;
  const filename = fileId + '.' + ext;

  if (supportedImages.includes(ext)) {
    await modifyImage(req.file.buffer, filename, opt);
    await res.send({filename: buildUrl(filename)});
  } else if (ext === 'mp4') {
    const fileMP4Path = 'public/mp4/' + filename;
    fs.writeFileSync(fileMP4Path, req.file.buffer);
    res.send({filename: buildUrl(filename)});

    // Video encoding in HLS for adaptive bitrate and resolution streaming
    // Reference : https://www.martin-riedl.de/2020/04/17/using-ffmpeg-as-a-hls-streaming-server-overview/
    const hlsPath = path.join(process.cwd(), `public/hls/${fileId}`);
    fs.mkdirSync(hlsPath, {recursive: true});
    const ffmpegExec = path.join(path.dirname(require.resolve('ffmpeg-static')), 'ffmpeg');
    console.log(path.join(process.cwd(), `public/hls/${fileId}`));
    const child = spawn(ffmpegExec, [
      '-i', `${path.join(process.cwd(), fileMP4Path)}`,
      // Creates two video feed, down scaling the resolution
      '-filter_complex',
      '[v:0]split=2[vtemp001][vtemp002];[vtemp001]scale=w=234:h=416[vout001];[vtemp002]scale=w=720:h=1280[vout002]',
      // Speed of conversion, fix framerate at 25, fix the segment duration
      '-preset', 'veryfast', '-g', '25', '-sc_threshold', '0',

      // Creates 2 versions: codec H.264, 2000k/6000k bitrate, with a bitrate cap at 10% and some buffer size
      '-map', '[vout001]', '-c:v:0', 'libx264', '-b:v:0',  '145k', '-maxrate:v:0',  '160k', '-bufsize:v:0',  '800k',
      '-map', '[vout002]', '-c:v:1', 'libx264', '-b:v:1', '3000k', '-maxrate:v:1', '3300k', '-bufsize:v:1', '4000k',

      // For the audio, the two feed are identical: Audio encoding (AAC), audio bitrate, stereo
      '-map', 'a:0', '-map', 'a:0',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',

      // Output format HLS, 6 seconds videos
      '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'event', '-hls_flags', 'independent_segments',

      // File structure settings
      '-master_pl_name', 'master.m3u8',
      '-hls_segment_filename', `stream_%v/data_%06d.ts`, '-strftime_mkdir', '1',
      '-var_stream_map', 'v:0,a:0 v:1,a:1',

      // Output
      `stream_%v.m3u8`,
    ], {cwd: hlsPath});

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.once('error', (err: Error) => console.log(`Error during the conversion: ${err}`));
    child.once('exit', (code: number, signal: string) => {
      if (code === 0) {
        console.log(`Convert video file ${fileId} with success !`);
      } else {
        console.log(`Bad error code at the exit of the conversion for video ${fileId} !`);
      }
    });
  } else {
    sendError('File format unsupported !', res);
  }
});

router.route('/:filename')
  .get(async (req, res) => {
    const [fullname, ext, opt, fileId, thumbnail] = parseFilename(req.params.filename);
    const originalFile = 'public/media/' + fileId + '.' + ext;
    const sentFile = 'public/media/' + fullname;

    if (supportedImages.includes(ext) && process.env.NODE_ENV === 'production') {
      if (await fileExists(originalFile)) {
        await modifyImage(originalFile, fullname, opt);
        await res.sendFile(path.join(process.cwd(), sentFile));
      } else {
        sendError('File does not exists', res, 400);
      }

    } else if (supportedImages.includes(ext)) {
      if (await fileExists(sentFile)) {
        await res.sendFile(path.join(process.cwd(), sentFile));
      } else {
        await modifyImage(originalFile, fullname, opt);
        await res.sendFile(path.join(process.cwd(), sentFile));
      }

    } else if (ext === 'mp4' && thumbnail && false) {
      const tbPath = path.join(process.cwd(), 'public/thumbnail/' + req.params.filename + '.png');
      const tbPathModified = path.join(process.cwd(),
        'public/thumbnail/' + buildModifiedFilename(req.params.filename, opt, 'png'));
      fs.access(tbPathModified, e => {
        if (!e) { return res.sendFile(tbPathModified); }
        genThumbnail(buildPath(req.params.filename), tbPath, '150x?', {path: ffmpeg})
          .then(() => modifyImage(tbPath, null, opt, tbPathModified))
          .then(() => res.sendFile(tbPathModified));
      });

    } else {
      sendError('File format unsupported !', res);
    }
  })

  .delete((req, res) => {
    fs.unlinkSync(buildPath(req.params.filename));
    sendSuccess(res);
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

export = router;
