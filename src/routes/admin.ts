import fs from 'fs';
import jwt from 'express-jwt';
import express_jwt_permissions from 'express-jwt-permissions';
import {Router} from 'express';
import * as path from 'path';
import {sendError, sendSuccess} from '../middleware/utils';
import {exec} from 'child_process';

const router = Router();
const auth = jwt({secret: process.env.JWT_SECRET});
const guard = express_jwt_permissions();
const cwd: string = process.cwd();

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execCmd(cmd: string) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

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
 * GET /admin/storage
 * Only for admins.
 * Monitor storage space on the server.
 * @return {total, used} in Gigabytes
 */
router.get('/storage', (req, res) => {
  const dir = process.env.NODE_ENV === 'development' ? '/dev/sda5' : '/dev/vda1';
  const totalCmd = 'df -k --output=size ' + dir;
  const usedCmd = 'df -k --output=used ' + dir;

  Promise
    .all([execCmd(totalCmd), execCmd(usedCmd)])
    .then((s: any) => {
      const total = Number(s[0].split('\n')[1].trim()) * 1024 / 1073741824;
      const used = Number(s[1].split('\n')[1].trim()) * 1024 / 1073741824;
      res.json({total, used});
    })
    .catch(err => sendError(err, res));
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
