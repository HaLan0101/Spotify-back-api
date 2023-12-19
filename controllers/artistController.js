import {PrismaClient} from '@prisma/client';
const prisma = new PrismaClient();
import client from '../redis';

export async function createArtist(req, res) {
  try {
    const {name} = req.body;
    if (!name) {
      return res.status(400).json({error: 'Name is required for the artist'});
    }

    const artist = await prisma.artists.create({
      data: {
        name,
      },
    });
    const cacheKey = 'artists';
    client.del(cacheKey);

    res
      .status(201)
      .json({message: 'Artist created successfully', artistId: artist.id});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getArtists(req, res) {
  try {
    const cacheKey = 'artists';
    client.get(cacheKey, async (err, cachedData) => {
      if (err) throw err;

      if (cachedData) {
        const artists = JSON.parse(cachedData);
        res.status(200).json(artists);
      } else {
        const artists = await prisma.artists.findMany({
          include: {
            albums: {
              include: {
                audios: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
        });
        client.setex(cacheKey, 3600, JSON.stringify(artists));
        res.status(200).json(artists);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getArtist(req, res) {
  try {
    const {artistId} = req.params;
    const cacheKey = `artist_${artistId}`;
    client.get(cacheKey, async (error, cachedArtist) => {
      if (error) {
        console.error(error);
        res.status(500).json({error: 'Internal Server Error'});
        return;
      }

      if (cachedArtist) {
        res.status(200).json(JSON.parse(cachedArtist));
      } else {
        const artist = await prisma.artists.findUnique({
          where: {id: parseInt(artistId)},
          include: {
            albums: {
              include: {
                audios: true,
              },
            },
          },
        });

        if (artist) {
          client.setex(cacheKey, 3600, JSON.stringify(artist));
          res.status(200).json(artist);
        } else {
          res.status(404).json({error: 'Artist not found'});
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteArtist(req, res) {
  try {
    const {artistId} = req.params;

    const artist = await prisma.artists.delete({
      where: {id: parseInt(artistId)},
      include: {
        albums: true,
        audios: true,
      },
    });
    const cacheKeyOne = `artist_${artistId}`;
    const cacheKey = 'artists';
    artist.albums.forEach(album => {
      const cacheKeyAlbum = `album_${album.id}`;
      client.del(cacheKeyAlbum);
    });
    const cacheKeyAlbums = 'albums';
    artist.audios.forEach(audio => {
      const cacheKeyAudio = `audio_${audio.id}`;
      client.del(cacheKeyAudio);
    });
    const cacheKeyAudios = 'audios';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyAudios);

    const artists = await prisma.artists.findMany({
      include: {
        albums: {
          include: {
            audios: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
    res.status(200).json(artists);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateArtist(req, res) {
  try {
    const {artistId} = req.params;
    const {name} = req.body;
    if (!name) {
      return res.status(400).json({error: 'Name is required for the artist'});
    }
    const artist = await prisma.artists.update({
      where: {id: parseInt(artistId)},
      data: {name: name},
      include: {
        albums: true,
        audios: true,
      },
    });
    const cacheKeyOne = `artist_${artistId}`;
    const cacheKey = 'artists';
    artist.albums.forEach(album => {
      const cacheKeyAlbum = `album_${album.id}`;
      client.del(cacheKeyAlbum);
    });
    const cacheKeyAlbums = 'albums';
    artist.audios.forEach(audio => {
      const cacheKeyAudio = `audio_${audio.id}`;
      client.del(cacheKeyAudio);
    });
    const cacheKeyAudios = 'audios';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyAudios);
    const artists = await prisma.artists.findMany({
      include: {
        albums: {
          include: {
            audios: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
    res.status(200).json(artists);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function search(req, res) {
  try {
    const {keyword} = req.body;

    if (!keyword) {
      return res.status(400).json({error: 'Keyword is required'});
    }

    const artists = await prisma.artists.findMany({
      where: {
        name: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    const albums = await prisma.albums.findMany({
      where: {
        title: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    const audios = await prisma.audios.findMany({
      where: {
        title: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    res.status(200).json({artists, albums, audios});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
