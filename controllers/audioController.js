import path from 'path';
import fs from 'fs';
import {convertToM4a} from '../scripts/converter';
import client from '../redis';
import {PrismaClient} from '@prisma/client';
import {uploadFile} from '../scripts/aws';
const prisma = new PrismaClient();
export async function createAudio(req, res) {
  try {
    const {title, albumId} = req.body;
    const audioFile = req.file;
    if (!title) {
      return res.status(400).json({error: 'Title is required for the audio'});
    }
    if (!audioFile) {
      res.status(400).json({error: 'No audio file uploaded'});
      return;
    }
    const inputBuffer = audioFile.buffer;

    const mimeType = audioFile.mimetype;
    const originalFileName = audioFile.originalname;
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const fileName = originalFileName.slice(0, lastDotIndex);
    const fileExtension = originalFileName.slice(lastDotIndex + 1);
    let url;
    if (fileExtension === 'm4a' || fileExtension === 'wav') {
      url = await uploadFile(inputBuffer, fileName, mimeType);
    } else {
      const outputPath = path.join(__dirname, `${fileName}.${fileExtension}`);
      fs.writeFileSync(outputPath, inputBuffer);
      await convertToM4a(outputPath, {bitrate: '64k'});
      fs.unlinkSync(outputPath);
      const outputPathM4a = path.join(__dirname, `${fileName}.m4a`);
      const fileBuffer = fs.readFileSync(outputPathM4a);
      url = await uploadFile(fileBuffer, fileName, mimeType);
      fs.unlinkSync(outputPathM4a);
    }

    const album = await prisma.albums.findUnique({
      where: {id: parseInt(albumId)},
      select: {artistId: true},
    });

    const audio = await prisma.audios.create({
      data: {
        title,
        albumId: parseInt(albumId),
        artistId: album.artistId,
        file: url,
      },
    });
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);

    res
      .status(201)
      .json({message: 'Audio created successfully', audioId: audio.id});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function createAudioFromAlbum(req, res) {
  try {
    const {title, albumId} = req.body;
    const audioFile = req.file;
    if (!title) {
      return res.status(400).json({error: 'Title is required for the audio'});
    }
    if (!audioFile) {
      res.status(400).json({error: 'No audio file uploaded'});
      return;
    }
    const inputBuffer = audioFile.buffer;

    const mimeType = audioFile.mimetype;
    const originalFileName = audioFile.originalname;
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const fileName = originalFileName.slice(0, lastDotIndex);
    const fileExtension = originalFileName.slice(lastDotIndex + 1);
    let url;
    if (fileExtension === 'm4a' || fileExtension === 'wav') {
      url = await uploadFile(inputBuffer, fileName, mimeType);
    } else {
      const outputPath = path.join(__dirname, `${fileName}.${fileExtension}`);
      fs.writeFileSync(outputPath, inputBuffer);
      await convertToM4a(outputPath, {bitrate: '64k'});
      fs.unlinkSync(outputPath);
      const outputPathM4a = path.join(__dirname, `${fileName}.m4a`);
      const fileBuffer = fs.readFileSync(outputPathM4a);
      url = await uploadFile(fileBuffer, fileName, mimeType);
      fs.unlinkSync(outputPathM4a);
    }

    const album = await prisma.albums.findUnique({
      where: {id: parseInt(albumId)},
      select: {artistId: true},
    });

    const audio = await prisma.audios.create({
      data: {
        title,
        albumId: parseInt(albumId),
        artistId: album.artistId,
        file: url,
      },
    });
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);

    const updatedAudios = await prisma.audios.findMany({
      where: {albumId: parseInt(albumId)},
    });

    res.status(201).json({
      message: 'Audio created successfully',
      audioId: audio.id,
      audiosInAlbum: updatedAudios,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAudios(req, res) {
  try {
    const cacheKey = 'audios';
    client.get(cacheKey, async (err, cachedData) => {
      if (err) throw err;

      if (cachedData) {
        const audios = JSON.parse(cachedData);
        res.status(200).json(audios);
      } else {
        const audios = await prisma.audios.findMany({
          include: {
            album: true,
            artist: true,
          },
          orderBy: {
            id: 'desc',
          },
        });
        client.setex(cacheKey, 3600, JSON.stringify(audios));
        res.status(200).json(audios);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAudio(req, res) {
  try {
    const {audioId} = req.params;
    const cacheKey = `audio_${audioId}`;
    client.get(cacheKey, async (error, cachedAudio) => {
      if (error) {
        console.error(error);
        res.status(500).json({error: 'Internal Server Error'});
        return;
      }

      if (cachedAudio) {
        res.status(200).json(JSON.parse(cachedAudio));
      } else {
        const audio = await prisma.audios.findUnique({
          where: {id: parseInt(audioId)},
          include: {
            album: true,
            artist: true,
          },
        });
        if (audio) {
          client.setex(cacheKey, 3600, JSON.stringify(audio));
          res.status(200).json(audio);
        } else {
          res.status(404).json({error: 'Audio not found'});
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAudio(req, res) {
  try {
    const {audioId} = req.params;

    const audio = await prisma.audios.delete({
      where: {id: parseInt(audioId)},
      include: {
        album: true,
        artist: true,
      },
    });
    const cacheKeyOne = `audio_${audioId}`;
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${audio.albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    const audios = await prisma.audios.findMany({
      include: {
        album: true,
        artist: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    res.status(200).json(audios);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAudioFromAlbum(req, res) {
  try {
    const {audioId} = req.params;

    const audio = await prisma.audios.delete({
      where: {id: parseInt(audioId)},
      include: {
        album: true,
        artist: true,
      },
    });
    const cacheKeyOne = `audio_${audioId}`;
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${audio.albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);

    const updatedAudios = await prisma.audios.findMany({
      where: {albumId: parseInt(audio.albumId)},
    });

    res.status(201).json({
      message: 'Audio deleted successfully',
      audioId: audio.id,
      audiosInAlbum: updatedAudios,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAudio(req, res) {
  try {
    const {audioId} = req.params;
    const {title} = req.body;
    const audioFile = req.file;
    if (!audioFile && !title) {
      res
        .status(400)
        .json({error: 'Title or audio is required for the update'});
      return;
    }
    let url;
    if (audioFile) {
      const inputBuffer = audioFile.buffer;

      const mimeType = audioFile.mimetype;
      const originalFileName = audioFile.originalname;
      const [fileName, fileExtension] = originalFileName.split('.');
      const outputPath = path.join(__dirname, `${fileName}.${fileExtension}`);
      fs.writeFileSync(outputPath, inputBuffer);
      await convertToM4a(outputPath, {bitrate: '64k'});
      fs.unlinkSync(outputPath);
      const outputPathM4a = path.join(__dirname, `${fileName}.m4a`);
      const fileBuffer = fs.readFileSync(outputPathM4a);
      const urlFile = await uploadFile(fileBuffer, fileName, mimeType);
      url = urlFile;
      fs.unlinkSync(outputPathM4a);
    }
    const audio = await prisma.audios.update({
      where: {id: parseInt(audioId)},
      data: {title: title, file: url},
    });
    const cacheKeyOne = `audio_${audioId}`;
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${audio.albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    const audios = await prisma.audios.findMany({
      include: {
        album: true,
        artist: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    res.status(200).json(audios);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAudioFromAlbum(req, res) {
  try {
    const {audioId} = req.params;
    const {title} = req.body;
    const audioFile = req.file;
    if (!audioFile && !title) {
      res
        .status(400)
        .json({error: 'Title or audio is required for the update'});
      return;
    }
    let url;
    if (audioFile) {
      const inputBuffer = audioFile.buffer;

      const mimeType = audioFile.mimetype;
      const originalFileName = audioFile.originalname;
      const [fileName, fileExtension] = originalFileName.split('.');
      const outputPath = path.join(__dirname, `${fileName}.${fileExtension}`);
      fs.writeFileSync(outputPath, inputBuffer);
      await convertToM4a(outputPath, {bitrate: '64k'});
      fs.unlinkSync(outputPath);
      const outputPathM4a = path.join(__dirname, `${fileName}.m4a`);
      const fileBuffer = fs.readFileSync(outputPathM4a);
      const urlFile = await uploadFile(fileBuffer, fileName, mimeType);
      url = urlFile;
      fs.unlinkSync(outputPathM4a);
    }
    const audio = await prisma.audios.update({
      where: {id: parseInt(audioId)},
      data: {title: title, file: url},
    });
    const cacheKeyOne = `audio_${audioId}`;
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${audio.albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);

    const updatedAudios = await prisma.audios.findMany({
      where: {albumId: parseInt(audio.albumId)},
    });

    res.status(201).json({
      message: 'Audio updated successfully',
      audioId: audio.id,
      audiosInAlbum: updatedAudios,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function playedAudio(req, res) {
  try {
    const {audioId} = req.params;
    const audio = await prisma.audios.update({
      where: {id: parseInt(audioId)},
      data: {
        lastListenedAt: new Date(),
        listenCount: {
          increment: 1,
        },
      },
    });
    const cacheKeyOne = `audio_${audioId}`;
    const cacheKey = 'audios';
    const cacheKeyAlbum = `album_${audio.albumId}`;
    const cacheKeyAlbums = 'albums';
    const cacheKeyArtist = `artist_${audio.artistId}`;
    const cacheKeyArtists = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);
    client.del(cacheKeyAlbum);
    client.del(cacheKeyAlbums);
    client.del(cacheKeyArtist);
    client.del(cacheKeyArtists);
    res.status(200).json({message: 'Audio marked as played'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function lastListenedAudios(req, res) {
  try {
    const lastListenedAudios = await prisma.audios.findMany({
      orderBy: {lastListenedAt: 'desc'},
      take: 20,
    });

    res.status(200).json(lastListenedAudios);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function topListenedAudios(req, res) {
  try {
    const topAudios = await prisma.audios.findMany({
      orderBy: {
        listenCount: 'desc',
      },
      take: 10,
    });

    res.status(200).json(topAudios);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function countAudio(req, res) {
  try {
    const totalAudioCount = await prisma.audios.count();

    res.status(200).json({totalAudioCount});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function countListenTotal(req, res) {
  try {
    const totalListenCount = await prisma.audios.aggregate({
      _sum: {
        listenCount: true,
      },
    });

    res
      .status(200)
      .json({totalListenCount: totalListenCount._sum.listenCount || 0});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
