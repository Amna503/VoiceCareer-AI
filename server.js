const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('VoiceCareer AI Backend Server Running Successfully!');
});

app.listen(PORT, () => {
  console.log(`Backend Server is running on port ${PORT}`);
});