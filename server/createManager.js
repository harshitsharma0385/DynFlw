
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Manager = require('./models/Manager');

async function createManager() {
    try {
        const { MONGO_URI, MANAGER_USERNAME, MANAGER_PASSWORD } = process.env;

        if (!MONGO_URI || !MANAGER_USERNAME || !MANAGER_PASSWORD) {
            throw new Error('Missing required environment variables.');
        }

        await mongoose.connect(MONGO_URI);

        const username = MANAGER_USERNAME.trim().toLowerCase();

        const existingManager = await Manager.findOne({ username });

        if (existingManager) {
            console.log('Manager account already exists.');
            return;
        }

        const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 12);

        await Manager.create({
            username,
            passwordHash
        });

        console.log('Manager account created successfully!');

    } catch (error) {
        console.error('Manager setup failed:', error.message);
        process.exitCode = 1;

    } finally {
        await mongoose.disconnect();
    }
}

createManager();
