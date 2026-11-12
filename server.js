const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// Create and initialize the database
const db = new sqlite3.Database('./appointments.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the appointments database.');
    // Create appointments table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      doctor TEXT NOT NULL,
      symptoms TEXT,
      language TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Telemed.html'));
});

// API to create a new appointment
app.post('/api/appointments', (req, res) => {
  const { name, phone, date, time, doctor, symptoms, language } = req.body;
  
  // Validate required fields
  if (!name || !phone || !date || !time || !doctor) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const sql = `INSERT INTO appointments (name, phone, date, time, doctor, symptoms, language) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [name, phone, date, time, doctor, symptoms, language], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to create appointment' });
    }
    
    // Return the created appointment with its ID
    res.status(201).json({
      id: this.lastID,
      name,
      phone,
      date,
      time,
      doctor,
      symptoms,
      language,
      status: 'pending'
    });
  });
});

// API to get all appointments
app.get('/api/appointments', (req, res) => {
  const sql = `SELECT * FROM appointments ORDER BY date, time`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve appointments' });
    }
    
    res.json(rows);
  });
});

// API to get a specific appointment
app.get('/api/appointments/:id', (req, res) => {
  const sql = `SELECT * FROM appointments WHERE id = ?`;
  
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to retrieve appointment' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(row);
  });
});

// API to update an appointment status
app.patch('/api/appointments/:id', (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  const sql = `UPDATE appointments SET status = ? WHERE id = ?`;
  
  db.run(sql, [status, req.params.id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to update appointment' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ id: req.params.id, status });
  });
});

// API to delete an appointment
app.delete('/api/appointments/:id', (req, res) => {
  const sql = `DELETE FROM appointments WHERE id = ?`;
  
  db.run(sql, [req.params.id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Failed to delete appointment' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});