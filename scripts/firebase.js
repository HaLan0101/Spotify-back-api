import {initializeApp} from 'firebase/app';
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} from 'firebase/storage';
import config from '../firebaseConfig';

initializeApp(config.firebaseConfig);

const storage = getStorage();

export async function uploadFile(file, filename, mimetype) {
  const dateTime = giveCurrentDateTime();

  const storageRef = ref(storage, `audio/${filename + dateTime}`);

  const metadata = {
    contentType: mimetype,
  };
  const snapshot = await uploadBytesResumable(storageRef, file, metadata);
  const downloadURL = await getDownloadURL(snapshot.ref);
  const downloadURLString = downloadURL.toString();
  return downloadURLString;
}

export async function uploadImage(file, filename, mimetype) {
  const dateTime = giveCurrentDateTime();

  const storageRef = ref(storage, `image/${filename + dateTime}`);

  const metadata = {
    contentType: mimetype,
  };
  const snapshot = await uploadBytesResumable(storageRef, file, metadata);
  const downloadURL = await getDownloadURL(snapshot.ref);
  const downloadURLString = downloadURL.toString();
  return downloadURLString;
}
const giveCurrentDateTime = () => {
  const today = new Date();
  const date =
    today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  const time =
    today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
  const dateTime = date + '-' + time;
  return dateTime;
};
