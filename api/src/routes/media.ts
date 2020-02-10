import upload from '../middleware/upload';
import * as express from 'express';
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

const router = express.Router();

// Media file supported format
const supportedImages = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif'];
const supportedVideos = ['mp4'];

class ImageOptions {
    quality: number;
    width: number;
    height: number;
}

function extractOptions(req: express.Request) {
    const opt = new ImageOptions();
    opt.quality = +req.query.quality ? clamp(+req.query.quality, 0, 100) : undefined;
    opt.width = +req.query.width ? clamp(+req.query.width, 0) : undefined;
    opt.height = +req.query.height ? clamp(+req.query.height, 0) : undefined;
    return opt;
}

function modifyImage(image: any, filename: string, opt: ImageOptions) {
    return Jimp.read(image).then(img => new Promise(r => img
        .quality(opt.quality ? opt.quality : 100)
        .resize(opt.width ? opt.width : (opt.height ? Jimp.AUTO : img.bitmap.width),
            opt.height ? opt.height : Jimp.AUTO)
        .write(buildPath(filename), r)));
}

/** MEDIA SERVER
 *
 * POST /media?quality=**&width=**&height=**
 * Upload a single file and return the url path, and change the quality and size.
 *
 * GET /media/:filename?quality=**&width=**&height=**
 * Return the file data with the quality and size requested
 *
 * DELETE /media/:filename
 * Delete a file on the disk
 */

router.post('/', upload.single('media'), (req, res) => {
    if (!req.file) {
        sendError('No media received !', res);
    }
    const ext = getExtension(req.file.originalname);
    const opt = extractOptions(req);
    const filename = `${uuidv4()}` + '.' + ext;

    if (supportedImages.includes(ext)) {
        modifyImage(req.file.buffer, filename, opt)
            .then(() => res.send({filename: buildUrl(filename, req.protocol, req.get('host'))}));
    } else if (supportedVideos.includes(ext)) {
        fs.writeFileSync(buildPath(filename), req.file.buffer);
        res.send({filename: buildUrl(filename, req.protocol, req.get('host'))});
    } else {
        sendError('File format unsupported !', res);
    }
});

router.route('/:filename')
    .get((req, res) => {
        const ext = getExtension(req.params.filename);
        const opt = extractOptions(req);

        if (supportedImages.includes(ext)) {
            const filename = buildModifiedFilename(req.params.filename, opt);

            new Promise((r, c) => fs.access(buildPath(filename), e => e ? c() : r()))
                .then(() => res.sendFile(path.join(process.cwd(), buildPath(filename))))
                .catch(() => modifyImage(buildPath(req.params.filename), filename, opt)
                    .then(() => res.sendFile(path.join(process.cwd(), buildPath(filename))))
                );
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
