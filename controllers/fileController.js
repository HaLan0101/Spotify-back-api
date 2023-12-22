const mm = require('music-metadata');
const path = require('path');
const fs = require('fs');
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const {uploadImage, uploadFile} = require('../scripts/aws');
const mimeTypes = require('mime-types');
const {createExtractorFromFile} = require('node-unrar-js');
async function musicParser(req, res) {
  try {
    const baseDirectory = path.join(__dirname, 'audios');
    const directories = fs.readdirSync(baseDirectory);
    const filePath = path.join(__dirname, 'images/empty-image.png');
    const imageBuffer = fs.readFileSync(filePath);
    let c = 0;
    for (const directory of directories) {
      c = c + 1;
      console.log('Start folder ' + c);
      const directoryPath = path.join(baseDirectory, directory);
      if (fs.statSync(directoryPath).isDirectory()) {
        const files = fs.readdirSync(directoryPath);
        let i = 0;
        for (const file of files) {
          i = i + 1;
          console.log('Start file ' + i);
          const filePath = path.join(directoryPath, file);
          const metadata = await mm.parseFile(filePath, {native: true});
          const nameArtist = metadata.common.artist;
          const getArtist = await prisma.artists.findFirst({
            where: {
              name: nameArtist,
            },
          });
          if (getArtist) {
            console.log('artist existed');
            //create album
            const titleAlbum = metadata.common.album;
            const getAlbum = await prisma.albums.findFirst({
              where: {
                title: titleAlbum,
              },
            });
            if (getAlbum) {
              console.log('album existed');
              //create audio
              const titleAudio = metadata.common.title;
              const getAudio = await prisma.audios.findFirst({
                where: {
                  title: titleAudio,
                },
              });
              if (getAudio) {
                console.log('audio existed');
              } else {
                console.log('new audio');
                //create audio
                const albumId = getAlbum.id;
                const fileBuffer = fs.readFileSync(filePath);
                const nameFileAudio = metadata.common.title;
                const mimeType = mimeTypes.lookup(filePath);
                const urlAudio = await uploadFile(
                  fileBuffer,
                  nameFileAudio,
                  mimeType,
                );
                await prisma.audios.create({
                  data: {
                    title: titleAudio,
                    albumId: parseInt(albumId),
                    artistId: getAlbum.artistId,
                    file: urlAudio,
                  },
                });
              }
            } else {
              console.log('new album');
              //create album
              const typeAlbum =
                metadata.common.genre && metadata.common.genre[0]
                  ? metadata.common.genre[0]
                  : 'unknown';
              const imageFormatAlbum =
                metadata.common.picture && metadata.common.picture[0].format
                  ? metadata.common.picture[0].format
                  : 'image/png';
              const artistId = getArtist.id;
              const nameImageAlbum = metadata.common.title;
              const fileImageAlbum =
                metadata.common.picture && metadata.common.picture[0].data
                  ? metadata.common.picture[0].data
                  : imageBuffer;
              const urlImage = await uploadImage(
                fileImageAlbum,
                nameImageAlbum,
                imageFormatAlbum,
              );
              const album = await prisma.albums.create({
                data: {
                  title: titleAlbum,
                  artistId: parseInt(artistId),
                  cover: urlImage,
                  type: typeAlbum,
                },
              });
              //create audio
              const titleAudio = metadata.common.title;
              const albumId = album.id;
              const fileBuffer = fs.readFileSync(filePath);
              const nameFileAudio = metadata.common.title;
              const mimeType = mimeTypes.lookup(filePath);
              const urlAudio = await uploadFile(
                fileBuffer,
                nameFileAudio,
                mimeType,
              );
              await prisma.audios.create({
                data: {
                  title: titleAudio,
                  albumId: parseInt(albumId),
                  artistId: album.artistId,
                  file: urlAudio,
                },
              });
            }
          } else {
            console.log('new artist');
            //create artist
            const artist = await prisma.artists.create({
              data: {
                name: nameArtist,
              },
            });
            //create album
            const titleAlbum = metadata.common.album;
            const typeAlbum =
              metadata.common.genre && metadata.common.genre[0]
                ? metadata.common.genre[0]
                : 'unknown';
            const imageFormatAlbum =
              metadata.common.picture && metadata.common.picture[0].format
                ? metadata.common.picture[0].format
                : 'image/png';
            const artistId = artist.id;
            const nameImageAlbum = metadata.common.title;
            const fileImageAlbum =
              metadata.common.picture && metadata.common.picture[0].data
                ? metadata.common.picture[0].data
                : imageBuffer;
            const urlImage = await uploadImage(
              fileImageAlbum,
              nameImageAlbum,
              imageFormatAlbum,
            );
            const album = await prisma.albums.create({
              data: {
                title: titleAlbum,
                artistId: parseInt(artistId),
                cover: urlImage,
                type: typeAlbum,
              },
            });
            //create audio
            const titleAudio = metadata.common.title;
            const albumId = album.id;
            const fileBuffer = fs.readFileSync(filePath);
            const nameFileAudio = metadata.common.title;
            const mimeType = mimeTypes.lookup(filePath);
            const urlAudio = await uploadFile(
              fileBuffer,
              nameFileAudio,
              mimeType,
            );
            await prisma.audios.create({
              data: {
                title: titleAudio,
                albumId: parseInt(albumId),
                artistId: album.artistId,
                file: urlAudio,
              },
            });
          }
          console.log('Finish file' + i);
        }
      }
      console.log('Finish folder ' + c);
    }
    res.status(201).json({message: 'OK'});
  } catch (error) {
    console.error(error.message);
  }
}

async function extractFile(req, res) {
  try {
    const baseDirectory = path.join(__dirname, 'rar');
    const outputDirectory = path.join(__dirname, 'audios');

    const files = fs.readdirSync(baseDirectory);

    for (const file of files) {
      const filePath = path.join(baseDirectory, file);
      if (path.extname(filePath).toLowerCase() === '.rar') {
        await extractRarArchive(filePath, outputDirectory);
      }
    }

    res.status(200).json({message: 'Extraction des fichiers terminée'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Erreur interne du serveur'});
  }
}

async function extractRarArchive(file, destination) {
  try {
    const extractor = await createExtractorFromFile({
      filepath: file,
      targetPath: destination,
    });

    [...extractor.extract().files];
  } catch (err) {
    console.error(err);
  }
}

module.exports = {musicParser, extractFile};
