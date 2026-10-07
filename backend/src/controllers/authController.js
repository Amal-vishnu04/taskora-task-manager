const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendWelcomeEmail } = require('../services/emailService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required',
    });
  }

  if (name.length > 100 || email.length > 255 || !emailPattern.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid name and email',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email],
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash],
    );

    try {
      await sendWelcomeEmail({
        name: result.rows[0].name,
        email: result.rows[0].email,
      });
      console.info('Welcome email sent successfully');
    } catch {
      console.error('Welcome email delivery failed');
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to register user',
    });
  }
}

async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email',
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to login user',
    });
  }
}

module.exports = { register, login };