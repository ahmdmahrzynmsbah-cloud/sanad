const app = require('./dist/server.cjs').default || require('./dist/server.cjs');
app.listen(3002, () => console.log('started'));
