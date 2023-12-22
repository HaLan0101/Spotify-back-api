const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: 'eu-west-3',
});
const s3 = new AWS.S3();
const bucketName = 'spotifybucket2023';
function uploadFile(file, filename, mimeType) {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    const dateTime = giveCurrentDateTime();
    const fileName = filename + dateTime;
    const uploadParams = {
      Bucket: bucketName + '/audio',
      Key: fileName,
      Body: file,
      ContentType: mimeType,
    };

    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.error('Error :', err);
      } else {
        const fileUrl = data.Location;
        const url = fileUrl.toString();
        const cloudFrontDomain = 'https://d3ozihag9834pq.cloudfront.net';
        const cloudFrontUrl = url.replace(
          'https://spotifybucket2023.s3.eu-west-3.amazonaws.com',
          cloudFrontDomain,
        );
        resolve(cloudFrontUrl);
      }
    });
  });
}

function uploadImage(file, filename, mimeType) {
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    const dateTime = giveCurrentDateTime();
    const fileName = filename + dateTime;
    const uploadParams = {
      Bucket: bucketName + '/image',
      Key: fileName,
      Body: file,
      ContentType: mimeType,
    };

    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.error('Error :', err);
      } else {
        const fileUrl = data.Location;
        const url = fileUrl.toString();
        const cloudFrontDomain = 'https://d3ozihag9834pq.cloudfront.net';
        const cloudFrontUrl = url.replace(
          'https://spotifybucket2023.s3.eu-west-3.amazonaws.com',
          cloudFrontDomain,
        );
        resolve(cloudFrontUrl);
      }
    });
  });
}

const giveCurrentDateTime = () => {
  const today = new Date();
  const date =
    today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  const time =
    today.getHours() + '-' + today.getMinutes() + '-' + today.getSeconds();
  const dateTime = date + '-' + time;
  return dateTime;
};
module.exports = {uploadFile, uploadImage};
