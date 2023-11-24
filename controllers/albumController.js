import db from '../db';
import {uploadImage} from '../scripts/firebase';

export async function createAlbum(req, res) {
  try {
    const {title} = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      res.status(400).json({error: 'No image file uploaded'});
      return;
    }
    const inputBuffer = imageFile.buffer;
    const mimeType = imageFile.mimetype;
    const originalFileName = imageFile.originalname;
    // eslint-disable-next-line no-unused-vars
    const [fileName, fileExtension] = originalFileName.split('.');
    const urlFile = await uploadImage(inputBuffer, fileName, mimeType);
    const url = urlFile.toString();

    const result = await db.one(
      'INSERT INTO albums(title, cover) VALUES($1, $2) RETURNING id',
      [title, url],
    );

    res
      .status(201)
      .json({message: 'Album created successfully', albumId: result.id});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAlbums(req, res) {
  try {
    const albums = await db.any('SELECT * FROM albums');
    res.status(200).json(albums);
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAlbum(req, res) {
  try {
    const {albumId} = req.params;

    const album = await db.oneOrNone('SELECT * FROM albums WHERE id = $1', [
      albumId,
    ]);

    if (album) {
      res.status(200).json(album);
    } else {
      res.status(404).json({error: 'Album not found'});
    }
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAlbum(req, res) {
  try {
    const {albumId} = req.params;

    await db.none('DELETE FROM audios WHERE album_id = $1', [albumId]);

    await db.none('DELETE FROM albums WHERE id = $1', [albumId]);

    res
      .status(200)
      .json({message: 'Album and associated audios deleted successfully'});
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAlbum(req, res) {
  try {
    const {albumId} = req.params;
    const {title, cover} = req.body;

    await db.none('UPDATE albums SET title = $1, cover = $2 WHERE id = $3', [
      title,
      cover,
      albumId,
    ]);

    res.status(200).json({message: 'Album updated successfully'});
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function addAudioToAlbum(req, res) {
  const {albumId} = req.params;
  const {audio_ids} = req.body;

  try {
    await db.tx(async t => {
      const audio = await t.oneOrNone('SELECT * FROM audios WHERE id = $1', [
        audio_ids,
      ]);
      if (!audio) {
        res.status(404).json({error: 'Audio not found'});
        return;
      }
      const album = await t.oneOrNone('SELECT * FROM albums WHERE id = $1', [
        albumId,
      ]);
      if (!album) {
        res.status(404).json({error: 'Album not found'});
        return;
      }
      const audioExistsInAlbum = await t.oneOrNone(
        'SELECT id FROM albums WHERE id = $1 AND $2 = ANY(audio_ids)',
        [albumId, audio_ids],
      );

      if (!audioExistsInAlbum) {
        await t.none('UPDATE audios SET album_id = $1 WHERE id = $2', [
          albumId,
          audio_ids,
        ]);
        await t.none(
          'UPDATE albums SET audio_ids = array_append(audio_ids, $1) WHERE id = $2',
          [audio_ids, albumId],
        );
      }
    });

    res.status(200).json({message: 'Audio added to album successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
