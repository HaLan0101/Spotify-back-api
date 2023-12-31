import {describe, it} from 'mocha';
import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../app';

const {expect} = chai;

chai.use(chaiHttp);

describe('POST /api/artist', () => {
  it('should create a new artist', async () => {
    const createRes = await chai
      .request(app)
      .post('/api/artist')
      .send({name: 'Test Artist'});

    expect(createRes).to.have.status(201);
    await chai.request(app).delete(`/api/artists/${createRes.body.artistId}`);
  });
});

describe('GET api/artists/:artistId', () => {
  it('should get artist details', async () => {
    const createRes = await chai
      .request(app)
      .post('/api/artist')
      .send({name: 'Test Artist'});

    const artistId = createRes.body.artistId;

    const getRes = await chai.request(app).get(`/api/artists/${artistId}`);

    expect(getRes).to.have.status(200);
    expect(getRes.body).to.have.property('id').equal(artistId);
    expect(getRes.body).to.have.property('name').equal('Test Artist');
    await chai.request(app).delete(`/api/artists/${artistId}`);
  });
});

describe('PUT /api/artists/:artistId', () => {
  it('should update artist details', async () => {
    const createRes = await chai
      .request(app)
      .post('/api/artist')
      .send({name: 'Test Artist'});

    const artistId = createRes.body.artistId;

    const updateRes = await chai
      .request(app)
      .put(`/api/artists/${artistId}`)
      .send({name: 'Updated Artist'});

    expect(updateRes).to.have.status(200);

    const getRes = await chai.request(app).get(`/api/artists/${artistId}`);

    expect(getRes).to.have.status(200);
    expect(getRes.body).to.have.property('id').equal(artistId);
    expect(getRes.body).to.have.property('name').equal('Updated Artist');
    await chai.request(app).delete(`/api/artists/${artistId}`);
  });
});

describe('DELETE /api/artists/:artistId', () => {
  it('should delete an artist', async () => {
    const createRes = await chai
      .request(app)
      .post('/api/artist')
      .send({name: 'Test Artist'});

    const artistId = createRes.body.artistId;

    const deleteRes = await chai
      .request(app)
      .delete(`/api/artists/${artistId}`);

    expect(deleteRes).to.have.status(200);

    const getRes = await chai.request(app).get(`/api/artists/${artistId}`);

    expect(getRes).to.have.status(404);
  });
});
