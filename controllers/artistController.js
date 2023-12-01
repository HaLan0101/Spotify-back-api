import db from '../db';
import client from '../redis';
export async function createArtist(req, res) {
  try {
    const {name} = req.body;
    const result = await db.one(
      'INSERT INTO artists(name) VALUES($1) RETURNING id',
      [name],
    );
    const cacheKey = 'artists';
    client.del(cacheKey);
    res
      .status(201)
      .json({message: 'Artist created successfully', artistId: result.id});
  } catch (error) {
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
        const artists = await db.any('SELECT * FROM artists');
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
        const artist = await db.oneOrNone(
          'SELECT * FROM artists WHERE id = $1',
          [artistId],
        );

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
  const artistId = req.params.artistId;

  try {
    await db.tx(async t => {
      const artist = await t.oneOrNone('SELECT * FROM artists WHERE id = $1', [
        artistId,
      ]);
      if (!artist) {
        res.status(404).json({error: 'Artist not found'});
        return;
      }

      await t.none('DELETE FROM albums WHERE artist_id = $1', [artistId]);

      await t.none('DELETE FROM artists WHERE id = $1', [artistId]);
    });

    const cacheKeyOne = `artist_${artistId}`;
    const cacheKey = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);

    res
      .status(200)
      .json({message: 'Artist and associated albums deleted successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateArtist(req, res) {
  try {
    const {artistId} = req.params;
    const {name} = req.body;

    await db.none('UPDATE artists SET name = $1 WHERE id = $2', [
      name,
      artistId,
    ]);
    const cacheKeyOne = `artist_${artistId}`;
    const cacheKey = 'artists';
    client.del(cacheKey);
    client.del(cacheKeyOne);

    res.status(200).json({message: 'Artist updated successfully'});
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}
export async function addAlbumToArtist(req, res) {
  const {artistId} = req.params;
  const {album_ids} = req.body;

  try {
    await db.tx(async t => {
      const artist = await t.oneOrNone('SELECT * FROM artists WHERE id = $1', [
        artistId,
      ]);
      if (!artist) {
        res.status(404).json({error: 'Artist not found'});
        return;
      }
      const album = await t.oneOrNone('SELECT * FROM albums WHERE id = $1', [
        album_ids,
      ]);
      if (!album) {
        res.status(404).json({error: 'Album not found'});
        return;
      }
      const albumExistsInArtist = await t.oneOrNone(
        'SELECT id FROM artists WHERE id = $1 AND $2 = ANY(album_ids)',
        [artistId, album_ids],
      );

      if (!albumExistsInArtist) {
        await t.none('UPDATE albums SET artist_id = $1 WHERE id = $2', [
          artistId,
          album_ids,
        ]);
        await t.none(
          'UPDATE artists SET album_ids = array_append(album_ids, $1) WHERE id = $2',
          [album_ids, artistId],
        );
      }
    });

    res.status(200).json({message: 'Album added to artist successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAlbumFromArtist(req, res) {
  const {artistId} = req.params;
  const {album_ids} = req.body;

  try {
    const artist = await db.oneOrNone('SELECT * FROM artists WHERE id = $1', [
      artistId,
    ]);
    if (!artist) {
      res.status(404).json({error: 'Artist not found'});
      return;
    }

    const album = await db.oneOrNone('SELECT * FROM albums WHERE id = $1', [
      album_ids,
    ]);
    if (!album) {
      res.status(404).json({error: 'Album not found'});
      return;
    }

    await db.none(
      'UPDATE artists SET album_ids = array_remove(album_ids, $1) WHERE id = $2',
      [album_ids, artistId],
    );

    await db.none('UPDATE albums SET artist_id = NULL WHERE id = $1', [
      album_ids,
    ]);

    res.status(200).json({message: 'Album removed from artist successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
