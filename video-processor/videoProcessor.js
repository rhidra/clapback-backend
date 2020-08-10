const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const genThumbnail = require('simple-thumbnail');
const {spawn} = require('child_process');
const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');


const queue = 'video_encoding';
let connection = null;
let channel = null;
let msg = null;

amqp.connect('amqp://localhost', (e, conn) => {
  if (e) {
    setTimeout(() => this.tryConnection(), 50);
  } else {
    this.connection = conn;
    conn.createChannel((err, chan) => {
      channel = chan;

      channel.assertQueue(queue, {durable: true});
      channel.prefetch(1); // Only consume one item at a time
      channel.consume(queue, (m) => processData(m), {noAck: false});
      console.log('Waiting for video to encode...');
    });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processData(m) {
  msg = m;
  const data = JSON.parse(msg.content.toString());
  console.log('Processing video', data.fileId);

  await processVideo(data.fileId, data.fileMP4Path);
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
  child.once('error', (err) => console.log(`Error during the conversion: ${err}`));
  child.once('exit', (code, signal) => {
    if (code === 0) {
      console.log(`Convert video file ${fileId} with success !`);
      channel.ack(msg);
    } else {
      console.log(`Bad error code at the exit of the conversion for video ${fileId} !`);
    }
  });
}

