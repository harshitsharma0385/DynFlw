
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');

const router = express.Router();

// Manager Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required.'
            });
        }

        const manager = await Manager.findOne({
            username: username.trim().toLowerCase()
        });

        if (!manager) {
            return res.status(401).json({
                message: 'Invalid username or password.'
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            manager.passwordHash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid username or password.'
            });
        }

        const token = jwt.sign(
            {
                managerId: manager._id,
                role: manager.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            manager: {
                id: manager._id,
                username: manager.username,
                role: manager.role
            }
        });

    } catch (error) {
        console.error('Manager login error:', error);

        res.status(500).json({
            message: 'Server error during login.'
        });
    }
});

module.exports = router;
