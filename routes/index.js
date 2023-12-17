import express from 'express';
import {
  createAudio,
  getAudios,
  getAudio,
  updateAudio,
  deleteAudio,
  playedAudio,
  lastListenedAudios,
  topListenedAudios,
  countAudio,
  countListenTotal,
} from '../controllers/audioController';
import {
  createArtist,
  getArtists,
  getArtist,
  deleteArtist,
  updateArtist,
} from '../controllers/artistController';
import {
  createAlbum,
  getAlbums,
  getAlbum,
  deleteAlbum,
  updateAlbum,
  countAlbum,
  filterTypeAlbum,
} from '../controllers/albumController';
import {musicParser, extractFile} from '../controllers/fileController';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const router = express.Router();

// Routes pour les audios
router.post('/audio', upload.single('audioFile'), createAudio);
router.get('/audios', getAudios);
router.get('/audios/:audioId', getAudio);
router.put('/audios/:audioId', upload.single('audioFile'), updateAudio);
router.delete('/audios/:audioId', deleteAudio);
router.post('/playedAudio/:audioId', playedAudio);
router.get('/topListenedAudios', topListenedAudios);
router.get('/lastListenedAudios', lastListenedAudios);
router.get('/countAudio', countAudio);
router.get('/countListenTotal', countListenTotal);

// Routes pour les artistes
router.post('/artist', createArtist);
router.get('/artists', getArtists);
router.get('/artists/:artistId', getArtist);
router.delete('/artists/:artistId', deleteArtist);
router.put('/artists/:artistId', updateArtist);

// Routes pour les albums
router.post('/album', upload.single('imageFile'), createAlbum);
router.get('/albums', getAlbums);
router.get('/albums/:albumId', getAlbum);
router.delete('/albums/:albumId', deleteAlbum);
router.put('/albums/:albumId', upload.single('imageFile'), updateAlbum);
router.get('/countAlbum', countAlbum);
router.get('/filterTypeAlbum', filterTypeAlbum);

// Routes pour les fichiers
router.get('/musicParser', musicParser);
router.get('/extractFile', extractFile);

export default router;
