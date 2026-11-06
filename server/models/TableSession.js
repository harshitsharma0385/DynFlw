const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const tableSessionSchema = new mongoose.Schema({

    sessionId: {
        type: String,
        default: randomUUID,
        unique: true,
        immutable: true
    },

    tableId: {
        type: String,
        required: true
    },

    tableNumber: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    },

    startedAt: {
        type: Date,
        default: Date.now
    },

    closedAt: {
        type: Date,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model('TableSession', tableSessionSchema);
