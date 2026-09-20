const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'items.json');

app.use(cors());
app.use(express.json());

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

function readItems() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeItems(items) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/items', (_req, res) => {
  res.json(readItems());
});

app.get('/api/items/:id', (req, res) => {
  const item = readItems().find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const { title, description } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const items = readItems();
  const item = {
    id: uuidv4(),
    title: title.trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(item);
  writeItems(items);
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const { title, description } = req.body || {};
  const items = readItems();
  const index = items.findIndex((i) => i.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  items[index] = {
    ...items[index],
    title: title.trim(),
    description: (description || '').trim(),
    updatedAt: new Date().toISOString(),
  };
  writeItems(items);
  res.json(items[index]);
});

app.delete('/api/items/:id', (req, res) => {
  const items = readItems();
  const index = items.findIndex((i) => i.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const [removed] = items.splice(index, 1);
  writeItems(items);
  res.json(removed);
});

ensureDataFile();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});
