const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();
const port = process.env.PORT;
app.use(cors());
app.use(bodyParser.json());

app.use('/api', routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
