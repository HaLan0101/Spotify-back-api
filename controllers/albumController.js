import client from '../redis';
import {uploadImage} from '../scripts/firebase';
import {PrismaClient} from '@prisma/client';
const prisma = new PrismaClient();

export async function createAlbum(req, res) {
  try {
    const {title, artistId} = req.body;
    const imageFile = req.file;
    const inputBuffer = imageFile.buffer;
    const mimeType = imageFile.mimetype;
    const originalFileName = imageFile.originalname;
    // eslint-disable-next-line no-unused-vars
    const [fileName, fileExtension] = originalFileName.split('.');
    const urlFile = await uploadImage(inputBuffer, fileName, mimeType);
    const cover = urlFile.toString();
    if (!title) {
      return res.status(400).json({error: 'Title is required for the album'});
    }
    if (!imageFile) {
      return res.status(400).json({error: 'No image file uploaded'});
    }

    const album = await prisma.albums.create({
      data: {
        title,
        artistId: parseInt(artistId),
        cover,
      },
    });
    const cacheKey = 'albums';
    const cacheKeyArtist = `artist_${artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    res
      .status(201)
      .json({message: 'Album created successfully', albumId: album.id});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAlbums(req, res) {
  try {
    const cacheKey = 'albums';
    client.get(cacheKey, async (err, cachedData) => {
      if (err) throw err;

      if (cachedData) {
        const albums = JSON.parse(cachedData);
        res.status(200).json(albums);
      } else {
        const albums = await prisma.albums.findMany({
          include: {
            audios: true,
            artist: true,
          },
        });
        client.setex(cacheKey, 3600, JSON.stringify(albums));
        res.status(200).json(albums);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAlbum(req, res) {
  try {
    const {albumId} = req.params;
    const cacheKey = `album_${albumId}`;
    client.get(cacheKey, async (error, cachedAlbum) => {
      if (error) {
        console.error(error);
        res.status(500).json({error: 'Internal Server Error'});
        return;
      }

      if (cachedAlbum) {
        res.status(200).json(JSON.parse(cachedAlbum));
      } else {
        const album = await prisma.albums.findUnique({
          where: {id: parseInt(albumId)},
          include: {
            audios: true,
            artist: true,
          },
        });
        if (album) {
          client.setex(cacheKey, 3600, JSON.stringify(album));
          res.status(200).json(album);
        } else {
          res.status(404).json({error: 'Album not found'});
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAlbum(req, res) {
  try {
    const {albumId} = req.params;

    const album = await prisma.albums.delete({
      where: {id: parseInt(albumId)},
      include: {
        audios: true,
        artist: true,
      },
    });
    const cacheKeyOne = `album_${albumId}`;
    const cacheKey = 'albums';
    album.audios.forEach(audio => {
      const cacheKeyAudio = `audio_${audio.id}`;
      client.del(cacheKeyAudio);
    });
    const cacheKeyAudios = 'audios';
    const cacheKeyArtist = `artist_${album.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAudios);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    const albums = await prisma.albums.findMany({
      include: {
        audios: true,
        artist: true,
      },
    });
    res.status(200).json(albums);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAlbum(req, res) {
  try {
    const {albumId} = req.params;
    const {title} = req.body;
    const imageFile = req.file;
    if (!imageFile && !title) {
      res
        .status(400)
        .json({error: 'Title or image is required for the update'});
      return;
    }
    let cover;
    if (imageFile) {
      const inputBuffer = imageFile.buffer;
      const mimeType = imageFile.mimetype;
      const originalFileName = imageFile.originalname;
      // eslint-disable-next-line no-unused-vars
      const [fileName, fileExtension] = originalFileName.split('.');
      const urlFile = await uploadImage(inputBuffer, fileName, mimeType);
      cover = urlFile.toString();
    }
    const album = await prisma.albums.update({
      where: {id: parseInt(albumId)},
      data: {
        title: title,
        cover: cover,
      },
      include: {
        audios: true,
        artist: true,
      },
    });
    const cacheKeyOne = `album_${albumId}`;
    const cacheKey = 'albums';
    album.audios.forEach(audio => {
      const cacheKeyAudio = `audio_${audio.id}`;
      client.del(cacheKeyAudio);
    });
    const cacheKeyAudios = 'audios';
    const cacheKeyArtist = `artist_${album.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAudios);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    const albums = await prisma.albums.findMany({
      include: {
        audios: true,
        artist: true,
      },
    });
    res.status(200).json(albums);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
