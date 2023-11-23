const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

async function convertToM4A(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg(inputPath)
      .audioCodec('aac')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}
module.exports = {convertToM4A};
