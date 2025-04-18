const express = require('express');
const bcrypt = require('bcryptjs'); // Changed from 'bcrypt'
const jwt = require('jsonwebtoken');
// Import the specific functions needed from db.js
const { findUserByEmail, createUser, findUserById } = require('../database/db');

const router = express.Router();
const saltRounds = 10; // For bcrypt hashing
const jwtSecret = process.env.JWT_SECRET || 'your-very-secure-secret'; // Use env var in production!
const jwtExpiresIn = '1h'; // Token expiration time

// --- Middleware ---
/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // if there isn't any token
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Invalid token
        }
        req.user = { id: user.userId, email: user.email }; // Add user payload to request
        next();
    });
};

// --- Routes ---

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Basic email format validation
  if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
  }

  // Basic password strength
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

    // Generate JWT for the new user
    const payload = { userId: newUser.id, email: newUser.email };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    res.status(201).json({ 
        message: 'User registered successfully', 
        user: { id: newUser.id, email: newUser.email },
        token 
    });

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

    res.json({ 
        message: 'Login successful', 
        user: { id: user.id, email: user.email },
        token 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - Get current user info based on token
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user is populated by authenticateToken middleware
        const user = await findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Return only necessary user info
        res.json({ id: user.id, email: user.email });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

module.exports = {
    authRouter: router,
    authenticateToken
};
