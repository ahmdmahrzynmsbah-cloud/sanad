const express = require('express');
const request = require('supertest');
const app = express();
app.get('/', (req, res) => { throw new Error("Boom"); });
request(app).get('/').expect(500).end((err, res) => {
  console.log(res.text);
});
