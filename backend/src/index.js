const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'items.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CORS_ORIGIN = process.env.CORS_ORIGIN || false;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  const insecureDefaults = new Set([
    '',
    'dev-only-change-me',
    'change-me-in-production',
    'secret',
    'jwt_secret',
  ]);
  if (insecureDefaults.has(secret) || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a strong value of at least 32 characters'
    );
  }
  return secret;
}

const JWT_SECRET = resolveJwtSecret();

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN || false,
    credentials: true,
  })
);
app.use(express.json({ limit: '32kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

function ensureDataFile(filePath, fallback) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback) {
  ensureDataFile(filePath, fallback);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  ensureDataFile(filePath, Array.isArray(data) ? [] : {});
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readItems() {
  return readJson(DATA_FILE, []);
}

function writeItems(items) {
  writeJson(DATA_FILE, items);
}

function readUsers() {
  return readJson(USERS_FILE, []);
}

function writeUsers(users) {
  writeJson(USERS_FILE, users);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// CSRF mitigation for browser clients: mutating requests must send a custom header
// (simple HTML form posts cannot set this). Bearer JWT alone already blocks classic CSRF.
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const requestedWith = req.get('x-requested-with');
  if (requestedWith !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Missing CSRF protection header' });
  }
  return next();
}

function sanitizeText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', csrfGuard, async (req, res) => {
  const username = sanitizeText(req.body?.username, 64).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const users = readUsers();
  if (users.some((u) => u.username === username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const user = {
    id: uuidv4(),
    username,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', csrfGuard, async (req, res) => {
  const username = sanitizeText(req.body?.username, 64).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const user = readUsers().find((u) => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

app.use('/api/items', authRequired, csrfGuard);

app.get('/api/items', (req, res) => {
  const items = readItems().filter((item) => item.ownerId === req.user.id);
  res.json(items);
});

app.get('/api/items/:id', (req, res) => {
  const item = readItems().find(
    (i) => i.id === req.params.id && i.ownerId === req.user.id
  );
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const title = sanitizeText(req.body?.title, 200);
  const description = sanitizeText(req.body?.description, 2000);

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const items = readItems();
  const item = {
    id: uuidv4(),
    ownerId: req.user.id,
    title,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(item);
  writeItems(items);
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const title = sanitizeText(req.body?.title, 200);
  const description = sanitizeText(req.body?.description, 2000);
  const items = readItems();
  const index = items.findIndex(
    (i) => i.id === req.params.id && i.ownerId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  items[index] = {
    ...items[index],
    title,
    description,
    updatedAt: new Date().toISOString(),
  };
  writeItems(items);
  res.json(items[index]);
});

app.delete('/api/items/:id', (req, res) => {
  const items = readItems();
  const index = items.findIndex(
    (i) => i.id === req.params.id && i.ownerId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const [removed] = items.splice(index, 1);
  writeItems(items);
  res.json(removed);
});

ensureDataFile(DATA_FILE, []);
ensureDataFile(USERS_FILE, []);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});
