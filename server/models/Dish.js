const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const dishSchema = new mongoose.Schema({
    dishId: {
        type: String,
        default: randomUUID,
        unique: true,
        immutable: true
    },
    qrUrl: {
        type: String,
        immutable: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    description: {
        type: String,
        default: ''
    },

    image: {
        type: String,
        default: ''
    },

    category: {
        type: String,
        required: true
    },

    isAvailable: {
        type: Boolean,
        default: true
    },

    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Dish', dishSchema);