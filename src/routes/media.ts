import upload from '../middleware/upload';
import fs from 'fs';
import Jimp from 'jimp';
import uuidv4 from 'uuid/v4';
import {
  buildModifiedFilename,
  buildPath,
  buildUrl,
  clamp,
  getExtension,
  sendError,
  sendSuccess
} from '../middleware/utils';
import * as path from 'path';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router, Request} from 'express';
// tslint:disable-next-line:no-var-requires
const genThumbnail = require('simple-thumbnail');
// tslint:disable-next-line:no-var-requires
const ffmpeg = require('ffmpeg-static');

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();

// Media file supported format
const supportedImages = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif'];
const supportedVideos = ['mp4'];

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

function modifyImage(image: any, filename: string, opt: ImageOptions, out?: string) {
  return Jimp.read(image).then(img => new Promise(r => {
    img = img.quality(opt.quality ? opt.quality : 100)
      .resize(opt.width ? opt.width : (opt.height ? Jimp.AUTO : img.bitmap.width),
        opt.height ? (opt.width ? Jimp.AUTO : opt.height) : Jimp.AUTO);
    if (opt.width && opt.height) {
      img = img.crop(0, 0, opt.width, opt.height);
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

router.post('/', auth, upload.single('media'), (req, res) => {
  console.log('MEDIA RECEIVED !');
  if (!req.file) {
    sendError('No media received !', res);
  }
  const ext = getExtension(req.file.originalname);
  const [opt, _] = extractOptions(req);
  const filename = `${uuidv4()}` + '.' + ext;

  if (supportedImages.includes(ext)) {
    modifyImage(req.file.buffer, filename, opt)
      .then(() => res.send({filename: buildUrl(filename)}));
  } else if (supportedVideos.includes(ext)) {
    fs.writeFileSync(buildPath(filename), req.file.buffer);
    res.send({filename: buildUrl(filename)});
  } else {
    sendError('File format unsupported !', res);
  }
});

router.route('/:filename')
  .get((req, res) => {
    const ext = getExtension(req.params.filename);
    const [opt, thumbnail] = extractOptions(req);

    if (supportedImages.includes(ext)) {
      const filename = buildModifiedFilename(req.params.filename, opt);

      new Promise((r, c) => fs.access(buildPath(filename), e => e ? c() : r()))
        .then(() => res.sendFile(path.join(process.cwd(), buildPath(filename))))
        .catch(() => modifyImage(buildPath(req.params.filename), filename, opt)
          .then(() => res.sendFile(path.join(process.cwd(), buildPath(filename))))
        );
    } else if (supportedVideos.includes(ext) && thumbnail) {
      const tbPath = path.join(process.cwd(), 'public/thumbnail/' + req.params.filename + '.png');
      const tbPathModified = path.join(process.cwd(),
        'public/thumbnail/' + buildModifiedFilename(req.params.filename, opt, 'png'));
      fs.access(tbPathModified, e => {
        if (!e) { return res.sendFile(tbPathModified); }
        genThumbnail(buildPath(req.params.filename), tbPath, '150x?', {path: ffmpeg})
          .then(() => modifyImage(tbPath, null, opt, tbPathModified))
          .then(() => res.sendFile(tbPathModified));
      });
    } else if (supportedVideos.includes(ext)) {
      res.sendFile(path.join(process.cwd(), buildPath(req.params.filename)));
    } else {
      sendError('File format unsupported !', res);
    }
  })
  .delete((req, res) => {
    fs.unlinkSync(buildPath(req.params.filename));
    sendSuccess(res);
  });

export = router;
