const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());
app.use('/tasks', taskRoutes);

// FIX (Bug #4): this handler used to return 500 for *every* error, including client
// errors like malformed JSON (body-parser sets err.status = 400). Respect 4xx statuses
// so clients get an accurate code; only log/mask genuine server errors.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: 'Invalid request body' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

module.exports = app;
