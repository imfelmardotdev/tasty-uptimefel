const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Import the specific functions needed from db.js
const { findUserByEmail, createUser } = require('../database/db');

const router = express.Router();
const saltRounds = 10; // For bcrypt hashing
const jwtSecret = process.env.JWT_SECRET || 'your-very-secure-secret'; // Use env var in production!
const jwtExpiresIn = '1h'; // Token expiration time


// --- Routes ---
// Helper functions are now imported from db.js

// POST /api/auth/register - Register a new user (e.g., first admin)
// In a real app, you might want to restrict this or have an invitation system
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Basic email format validation (can be improved)
  if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
  }

  // Basic password strength (example: min 8 chars)
  if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' }); // Conflict
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in the database
    const newUser = await createUser(email, passwordHash);

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.message === 'Email already exists') {
        res.status(409).json({ error: 'Email already registered' });
    } else {
        res.status(500).json({ error: 'Failed to register user' });
    }
  }
});

// POST /api/auth/login - Authenticate user and return JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' }); // Unauthorized
    }

    // Compare provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' }); // Unauthorized
    }

    // Passwords match, generate JWT
    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    res.json({ message: 'Login successful', token });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
