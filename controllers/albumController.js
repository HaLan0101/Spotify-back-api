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
    const imageFile = req.file;
    const {title} = req.body;

    if (!imageFile && !title) {
      res
        .status(400)
        .json({error: 'Title or Image is required for the update'});
      return;
    }

    let url;
    if (imageFile) {
      console.log('coucou');
      const inputBuffer = imageFile.buffer;
      const mimeType = imageFile.mimetype;
      const originalFileName = imageFile.originalname;
      // eslint-disable-next-line no-unused-vars
      const [fileName, fileExtension] = originalFileName.split('.');
      const urlFile = await uploadImage(inputBuffer, fileName, mimeType);
      url = urlFile.toString();
    }

    if (imageFile && !title) {
      console.log('coucou1');
      await db.none('UPDATE albums SET cover = $1 WHERE id = $2', [
        url,
        albumId,
      ]);
      res.status(200).json({message: 'Image of album updated successfully'});
    } else if (!imageFile && title) {
      console.log('coucou2');
      await db.none('UPDATE albums SET title = $1 WHERE id = $2', [
        title,
        albumId,
      ]);
      res.status(200).json({message: 'Title of album updated successfully'});
    } else {
      console.log('coucou3');
      await db.none('UPDATE albums SET title = $1, cover = $2 WHERE id = $3', [
        title,
        url,
        albumId,
      ]);
      res.status(200).json({message: 'Album updated successfully'});
    }
  } catch (error) {
    console.error(error);
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
export async function deleteAudioFromAlbum(req, res) {
  const {albumId} = req.params;
  const {audio_ids} = req.body;

  try {
    const album = await db.oneOrNone('SELECT * FROM albums WHERE id = $1', [
      albumId,
    ]);
    if (!album) {
      res.status(404).json({error: 'Album not found'});
      return;
    }

    const audio = await db.oneOrNone('SELECT * FROM audios WHERE id = $1', [
      audio_ids,
    ]);
    if (!audio) {
      res.status(404).json({error: 'Audio not found'});
      return;
    }

    await db.none(
      'UPDATE albums SET audio_ids = array_remove(audio_ids, $1) WHERE id = $2',
      [audio_ids, albumId],
    );

    await db.none('UPDATE audios SET album_id = NULL WHERE id = $1', [
      audio_ids,
    ]);

    res.status(200).json({message: 'Audio removed from album successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAlbumsWithoutAnyArtist(req, res) {
  try {
    const albumsWithoutArtist = await db.any(
      'SELECT * FROM albums WHERE artist_id IS NULL',
    );

    res.status(200).json(albumsWithoutArtist);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
