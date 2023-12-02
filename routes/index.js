import express from 'express';
import {
  createAudio,
  getAudios,
  getAudio,
  updateAudio,
  deleteAudio,
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
} from '../controllers/albumController';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const router = express.Router();

// Routes pour les audios
router.post('/audio', upload.single('audioFile'), createAudio);
router.get('/audios', getAudios);
router.get('/audios/:audioId', getAudio);
router.put('/audios/:audioId', updateAudio);
router.delete('/audios/:audioId', deleteAudio);

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

export default router;
