const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET = 'supersecretkey';

app.use(cors());
app.use(express.json());

// Middleware: Auth
/*
async function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
*/

// Auth Routes
/*
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) return res.status(409).json({ error: 'User exists' });
    const hash = bcrypt.hashSync(password, 8);
    await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash]);
    res.json({ message: 'Registered' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '2h' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});
*/

// Transactions CRUD
app.get('/transactions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
});

app.post('/transactions', async (req, res) => {
  const { amount, type, category, account, date, time, notes, recurring } = req.body;
  if (!amount || !type || !category || !date) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [result] = await pool.query(
      'INSERT INTO transactions (user_id, account_id, amount, type, category, date, time, notes, recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [null, account || null, amount, type, category, date, time || null, notes || '', recurring || null]
    );
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add transaction', details: err.message });
  }
});

app.put('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE transactions SET ? WHERE id = ?', [req.body, id]);
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update transaction', details: err.message });
  }
});

app.delete('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction', details: err.message });
  }
});

// Serve static files from client
app.use(express.static(path.join(__dirname, '../client')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));