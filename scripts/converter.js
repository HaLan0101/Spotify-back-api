const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

function convertToM4a(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg(filePath)
      .audioCodec('aac')
      .audioBitrate(options.bitrate || '128k')
      .on('end', () => {
        console.log('Conversion to m4a finished');
        resolve();
      })
      .on('error', err => {
        console.error('Error during conversion to m4a:', err);
        reject(err);
      })
      .save(filePath.replace(/\..+$/, '.m4a'));
  });
}
module.exports = {convertToM4a};
