
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        default: randomUUID,
        unique: true,
        immutable: true
    },

    // Restaurant table information
    tableId: {
        type: String,
        required: true,
        immutable: true
    },

    tableNumber: {
        type: Number,
        required: true,
        min: 1,
        immutable: true
    },

    // Identifies the specific dining visit
    tableSessionId: {
        type: String,
        required: true,
        immutable: true
    },

    // Ordered dishes
    items: [{
        dishId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],

    // Instructions for the entire order
    specialInstructions: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },

    total: {
        type: Number,
        required: true,
        min: 0
    },

    status: {
        type: String,
        enum: ['received', 'preparing', 'ready', 'served', 'cancelled'],
        default: 'received'
    },

    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
