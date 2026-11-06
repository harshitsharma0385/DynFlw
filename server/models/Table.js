const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const tableSchema = new mongoose.Schema({

    tableId: {
        type: String,
        default: randomUUID,
        unique: true,
        immutable: true
    },

    tableNumber: {
        type: Number,
        required: true,
        min: 1,
        unique: true
    },

    qrToken: {
        type: String,
        default: randomUUID,
        unique: true,
        immutable: true
    },

    qrUrl:{
        type: String,
        immutable: true
    },

    capacity: {
        type: Number,
        default: 4,
        min: 1
    },

    status: {
        type: String,
        enum: ['available', 'occupied', 'disabled'],
        default: 'available'
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);