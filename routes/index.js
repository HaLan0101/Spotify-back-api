const express = require('express');
const audioController = require('../controllers/audioController');
const artistController = require('../controllers/artistController');
const albumController = require('../controllers/albumController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const router = express.Router();

// Routes pour les audios
router.post('/audio', upload.single('audioFile'), audioController.createAudio);
router.get('/audios', audioController.getAudios);
router.get('/audios/:audioId', audioController.getAudio);
router.put('/audios/:audioId', audioController.updateAudio);
router.delete('/audios/:audioId', audioController.deleteAudio);

// Routes pour les artistes
router.post('/artist', artistController.createArtist);
router.get('/artists', artistController.getArtists);
router.get('/artists/:artistId', artistController.getArtist);
router.post(
  '/artists/addAlbum/:artistId/:albumId',
  artistController.addAlbumToArtist,
);
router.delete('/artists/:artistId', artistController.deleteArtist);
router.put('/artists/:artistId', artistController.updateArtist);

// Routes pour les albums
router.post('/album', albumController.createAlbum);
router.get('/albums', albumController.getAlbums);
router.get('/albums/:albumId', albumController.getAlbum);
router.delete('/albums/:albumId', albumController.deleteAlbum);
router.put('/albums/:albumId', albumController.updateAlbum);
router.post(
  '/albums/addAudio/:albumId/:audioId',
  albumController.addAudioToAlbum,
);

module.exports = router;
