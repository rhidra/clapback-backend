const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const genThumbnail = require('simple-thumbnail');
const {spawn} = require('child_process');
const amqp = require('amqplib/callback_api');
const {MongoClient} = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();


const queue_in = 'video_encoding_in';
const queue_out = 'video_encoding_out'
let connection = null;
let channel_in = null;
let channel_out = null;


const dbURI = process.env.NODE_ENV === 'development' ? 'mongodb://localhost:27017/zuoyou' : `mongodb://mongo:27017/zuoyou`;
let clientDB = new MongoClient(dbURI);
let db = null;

async function tryConnectionMQ() {
  amqp.connect('amqp://localhost', async (e, conn) => {
    if (e) {
      setTimeout(() => tryConnectionMQ(), 50);
    } else {
      connection = conn;

      // Create the in channel
      connection.createChannel((err, chan) => {
        channel_in = chan;

        channel_in.assertQueue(queue_in, {durable: true});
        channel_in.prefetch(1); // Only consume one item at a time
        channel_in.consume(queue_in, (m) => processData(m), {noAck: false});
        console.log('Waiting for video to encode...');
      });

      // Create the out channel
      channel_out = await connection.createConfirmChannel();
      channel_out.assertQueue(queue_out, {durable: true});
      channel_out.prefetch(1);
    }
  });
}

async function tryConnectionDB() {
  try  {
    await clientDB.connect();
    await clientDB.db('zuoyou').command({ping: 1});
    db = clientDB.db('zuoyou');
    console.log('Successfully connected to the DB');
  } catch (e) {
      console.error(e);
      setTimeout(() => tryConnectionDB(), 100);
  }
}

tryConnectionMQ();
tryConnectionDB();

async function processData(msg) {
  const data = JSON.parse(msg.content.toString());
  console.log('Processing video', data.fileId);

  try {
    await processVideo(data.fileId, data.fileMP4Path);
    console.log(`Converted video file ${data.fileId} successfully !`);
    channel_out.sendToQueue(queue_out, Buffer.from(JSON.stringify({fileId: data.fileId})), {persistent: true}, (err, ok) => {
      if (err === null) {
        channel_in.ack(msg);
      } else {
        channel_in.nack(msg);
      }
    });
  } catch (e) {
    console.log(`Error during the conversion: ${e}`);
    channel_in.nack(msg);
  }
}

async function processVideo(fileId, fileMP4Path) {
  // Thumbnail generation
  const tbPath = path.join(process.cwd(), 'public/thumbnail', fileId + '.png');
  await genThumbnail(fileMP4Path, tbPath, '150x?', {path: ffmpeg});

  // Video encoding in HLS for adaptive bitrate and resolution streaming
  // Reference : https://www.martin-riedl.de/2020/04/17/using-ffmpeg-as-a-hls-streaming-server-overview/
  const hlsPath = path.join(process.cwd(), `public/hls/${fileId}`);
  fs.mkdirSync(hlsPath, {recursive: true});
  const ffmpegExec = path.join(path.dirname(require.resolve('ffmpeg-static')), 'ffmpeg');
  const speed = process.env.NODE_ENV === 'development' ? 'veryfast' : `veryslow`;

  const child = spawn(ffmpegExec, [
    '-i', `${path.join(process.cwd(), fileMP4Path)}`,
    // Creates two video feed, down scaling the resolution
    '-filter_complex',
    '[v:0]split=2[vtemp001][vtemp002];[vtemp001]scale=w=234:h=416[vout001];[vtemp002]scale=w=720:h=1280[vout002]',
    // Speed of conversion, fix framerate at 25, fix the segment duration
    '-preset', speed, '-g', '25', '-sc_threshold', '0',

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

  return new Promise((resolve, reject) => {
    child.once('error', (err) => reject(err));
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`Error code ${code}`);
      }
    });
  });
}