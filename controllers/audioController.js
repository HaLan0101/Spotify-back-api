import db from '../db';
import path from 'path';
import fs from 'fs';
import {convertToM4a} from '../scripts/converter';
import {uploadFile} from '../scripts/firebase';

export async function createAudio(req, res) {
  try {
    const {title} = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      res.status(400).json({error: 'No audio file uploaded'});
      return;
    }
    const inputBuffer = audioFile.buffer;

    const mimeType = audioFile.mimetype;
    const originalFileName = audioFile.originalname;
    const [fileName, fileExtension] = originalFileName.split('.');
    const outputPath = path.join(
      __dirname,
      '../output',
      `${fileName}.${fileExtension}`,
    );
    fs.writeFileSync(outputPath, inputBuffer);
    await convertToM4a(outputPath, {bitrate: '64k'});
    fs.unlinkSync(outputPath);
    const outputPathM4a = path.join(__dirname, '../output', `${fileName}.m4a`);
    const fileBuffer = fs.readFileSync(outputPathM4a);
    const urlFile = await uploadFile(fileBuffer, fileName, mimeType);
    const url = urlFile.toString();
    fs.unlinkSync(outputPathM4a);
    const result = await db.one(
      'INSERT INTO audios(title, file) VALUES($1, $2) RETURNING id',
      [title, url],
    );

    res
      .status(201)
      .json({message: 'Audio uploaded successfully', audioId: result.id});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAudios(req, res) {
  try {
    const audios = await db.any('SELECT * FROM audios');
    res.status(200).json(audios);
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function getAudio(req, res) {
  try {
    const {audioId} = req.params;

    const audio = await db.oneOrNone('SELECT * FROM audios WHERE id = $1', [
      audioId,
    ]);

    if (audio) {
      res.status(200).json(audio);
    } else {
      res.status(404).json({error: 'Audio not found'});
    }
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function updateAudio(req, res) {
  try {
    const {audioId} = req.params;
    const {title} = req.body;

    await db.none('UPDATE audios SET title = $1 WHERE id = $2', [
      title,
      audioId,
    ]);

    res.status(200).json({message: 'Audio updated successfully'});
  } catch (error) {
    res.status(500).json({error: 'Internal Server Error'});
  }
}

export async function deleteAudio(req, res) {
  const {audioId} = req.params;

  try {
    await db.tx(async t => {
      await t.none('DELETE FROM audios WHERE id = $1', [audioId]);
      await t.none(
        'UPDATE albums SET audio_ids = array_remove(audio_ids, $1) WHERE $1 = ANY(audio_ids)',
        [audioId],
      );
    });

    res.status(200).json({message: 'Audio deleted successfully'});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Internal Server Error'});
  }
}
