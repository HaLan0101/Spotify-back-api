import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
const port = process.env.PORT;
app.use(cors());
app.use(bodyParser.json());

app.use('/api', routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
