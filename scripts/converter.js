import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

export function convertToM4a(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegPath.path);
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
