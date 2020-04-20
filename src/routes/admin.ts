import fs from 'fs';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';
import * as path from 'path';
import {sendSuccess} from '../middleware/utils';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();
const cwd: string = process.cwd();

/*** ROUTES ONLY FOR ADMINS ! ***/
router.use(auth, guard.check('admin'));

/**
 * GET /admin/media
 * Only for admins.
 * Helps to clean the storage of the server.
 * @return {medias: [string], thumbnailsSize, mediasSize}
 */
router.get('/media', (req, res) => {
  const medias: string[] = fs.readdirSync(path.join(cwd, 'public/media'));
  const thumbnailsSize = fs.readdirSync(path.join(cwd, 'public/thumbnail'))
    .reduce((s: number, tb: string) => s + fs.statSync(path.join(cwd, 'public/thumbnail', tb)).size, 0);
  const mediasSize = medias
    .reduce((s: number, media: string) => s + fs.statSync(path.join(cwd, 'public/media', media)).size, 0);

  res.json({medias, thumbnailsSize, mediasSize});
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