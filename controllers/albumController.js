import client from '../redis';
import {uploadImage} from '../scripts/aws';
import {PrismaClient} from '@prisma/client';
const prisma = new PrismaClient();
const validTypes = [
  'Jazz',
  "Rock 'n' Roll",
  'Country',
  'Rock',
  'Vocal jazz',
  'Rock & Roll',
  "Rock'N'Roll",
  'Latin',
  'Folk',
  'Vocal Jazz',
  'Cool Jazz',
  'Singer/Folk rock',
  'Pop',
  'Ethnic',
  'Soul Jazz',
  'Soul',
  'R&B',
  'Bossa Nova',
  'Folk rock',
  'Christmas',
  'Blues',
  'Chanson',
  'Garage Rock',
  'Hard Bop',
  'Classic Rock',
  'Classic Folk Rock',
  'Baroque Pop, Psychedelic Pop',
  'Folk-Rock',
  'Garage rock',
  'Pop/Rock',
  'Experimental rock',
  'Folk/Rock',
  'Psychedelic Rock',
  'Pop soul',
  'Psychadelic',
  'World',
  'Progressive Rock',
  'Psychedelic Folk',
  'Indian Classical',
  'Soul, blues',
  'Hard Rock',
  'Blues rock',
  'Bossa nova',
  'Baroque Pop, Rock`n`Roll, 60s',
  'Country rock',
  'Jazz rock',
  'Country Rock',
  'Funk',
  'Folk Rock',
  'Instrumental Pop',
  'Rythm and blues',
  'Proto prog',
  'Blues-Rock',
  'Indian',
  'Psychedelic',
  'Proto punk',
  'Rock, folk',
  'A Cappella',
  'Folk prog rock',
  'Pop folk',
  'Pop/Funk',
  'Jazz vocals',
  'Afrobeat',
  'Glam Rock',
  'Heavy Metal',
  'unknown',
  'Jazz-rock',
  'Glam rock',
];
export async function createAlbum(req, res) {
  try {
    const {title, artistId, type} = req.body;
    const imageFile = req.file;
    if (!title) {
      return res.status(400).json({error: 'Title is required for the album'});
    }
    if (!imageFile) {
      return res.status(400).json({error: 'No image file uploaded'});
    }
    if (!type) {
      return res.status(400).json({error: 'Type is required '});
    }
    if (!validTypes.includes(type)) {
      res.status(400).json({error: 'Invalid album type'});
      return;
    }
    const inputBuffer = imageFile.buffer;
    const mimeType = imageFile.mimetype;
    const originalFileName = imageFile.originalname;
    // eslint-disable-next-line no-unused-vars
    const [fileName, fileExtension] = originalFileName.split('.');
    const url = await uploadImage(inputBuffer, fileName, mimeType);
    const album = await prisma.albums.create({
      data: {
        title,
        artistId: parseInt(artistId),
        cover: url,
        type,
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

export async function createAlbumFromArtist(req, res) {
  try {
    const {title, artistId, type} = req.body;
    const imageFile = req.file;
    if (!title) {
      return res.status(400).json({error: 'Title is required for the album'});
    }
    if (!imageFile) {
      return res.status(400).json({error: 'No image file uploaded'});
    }
    if (!type) {
      return res.status(400).json({error: 'Type is required '});
    }
    if (!validTypes.includes(type)) {
      res.status(400).json({error: 'Invalid album type'});
      return;
    }
    const inputBuffer = imageFile.buffer;
    const mimeType = imageFile.mimetype;
    const originalFileName = imageFile.originalname;
    // eslint-disable-next-line no-unused-vars
    const [fileName, fileExtension] = originalFileName.split('.');
    const url = await uploadImage(inputBuffer, fileName, mimeType);
    const album = await prisma.albums.create({
      data: {
        title,
        artistId: parseInt(artistId),
        cover: url,
        type,
      },
    });
    const cacheKey = 'albums';
    const cacheKeyArtist = `artist_${artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    const updatedAlbums = await prisma.albums.findMany({
      where: {artistId: parseInt(artistId)},
    });

    res.status(201).json({
      message: 'Album created successfully',
      albumId: album.id,
      albumsInArtist: updatedAlbums,
    });
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
          orderBy: {
            id: 'desc',
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
      orderBy: {
        id: 'desc',
      },
    });
    res.status(200).json(albums);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAlbumFromArtist(req, res) {
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
    const updatedAlbums = await prisma.albums.findMany({
      where: {artistId: parseInt(album.artistId)},
    });

    res.status(201).json({
      message: 'Album deleted successfully',
      albumId: album.id,
      albumsInArtist: updatedAlbums,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAlbum(req, res) {
  try {
    const {albumId} = req.params;
    const {title, type} = req.body;
    const imageFile = req.file;
    if (!imageFile && !title && !type) {
      res
        .status(400)
        .json({error: 'Title or image or type is required for the update'});
      return;
    }
    if (type) {
      if (!validTypes.includes(type)) {
        res.status(400).json({error: 'Invalid album type'});
        return;
      }
    }
    let cover;
    if (imageFile) {
      const inputBuffer = imageFile.buffer;
      const mimeType = imageFile.mimetype;
      const originalFileName = imageFile.originalname;
      // eslint-disable-next-line no-unused-vars
      const [fileName, fileExtension] = originalFileName.split('.');
      const urlFile = await uploadImage(inputBuffer, fileName, mimeType);
      cover = urlFile;
    }
    const album = await prisma.albums.update({
      where: {id: parseInt(albumId)},
      data: {
        title: title,
        cover: cover,
        type,
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
      orderBy: {
        id: 'desc',
      },
    });
    res.status(200).json(albums);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAlbumFromArtist(req, res) {
  try {
    const {albumId} = req.params;
    const {title, type} = req.body;
    const imageFile = req.file;
    if (!imageFile && !title && !type) {
      res
        .status(400)
        .json({error: 'Title or image or type is required for the update'});
      return;
    }
    if (type) {
      if (!validTypes.includes(type)) {
        res.status(400).json({error: 'Invalid album type'});
        return;
      }
    }
    let cover;
    if (imageFile) {
      const inputBuffer = imageFile.buffer;
      const mimeType = imageFile.mimetype;
      const originalFileName = imageFile.originalname;
      // eslint-disable-next-line no-unused-vars
      const [fileName, fileExtension] = originalFileName.split('.');
      const urlFile = await uploadImage(inputBuffer, fileName, mimeType);
      cover = urlFile;
    }
    const album = await prisma.albums.update({
      where: {id: parseInt(albumId)},
      data: {
        title: title,
        cover: cover,
        type,
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
    const updatedAlbums = await prisma.albums.findMany({
      where: {artistId: parseInt(album.artistId)},
    });

    res.status(201).json({
      message: 'Album updated successfully',
      albumId: album.id,
      albumsInArtist: updatedAlbums,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function countAlbum(req, res) {
  try {
    const totalAlbumCount = await prisma.albums.count();

    res.status(200).json({totalAlbumCount});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function filterTypeAlbum(req, res) {
  try {
    const {type} = req.body;
    if (!type) {
      return res.status(400).json({error: 'Type is required'});
    }
    if (!validTypes.includes(type)) {
      res.status(400).json({error: 'Invalid album type'});
      return;
    }
    const albums = await prisma.albums.findMany({
      where: {
        type: {
          equals: type,
        },
      },
      include: {
        artist: true,
        audios: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    res.status(200).json(albums);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getUniqueAlbumTypes(req, res) {
  try {
    const albums = await prisma.albums.findMany();

    const uniqueTypesSet = new Set(albums.map(album => album.type));

    const uniqueTypesArray = [...uniqueTypesSet];

    res.status(200).json({uniqueAlbumTypes: uniqueTypesArray});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function last5Albums(req, res) {
  try {
    const last5Albums = await prisma.albums.findMany({
      take: 5,
      orderBy: {
        id: 'desc',
      },
      include: {
        artist: true,
        audios: true,
      },
    });

    res.status(200).json(last5Albums);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
