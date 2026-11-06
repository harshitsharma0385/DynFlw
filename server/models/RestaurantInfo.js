
const mongoose = require('mongoose');

const restaurantInfoSchema = new mongoose.Schema({
    restaurantName: {
        type: String,
        required: true,
        trim: true,
        default: 'My Restaurant'
    },
    tagline: {
        type: String,
        trim: true,
        default: ''
    },
    logo: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    gstin: {
        type: String,
        trim: true,
        uppercase: true,
        default: ''
    },
    invoiceFooter: {
        type: String,
        trim: true,
        default: 'Thank you for dining with us!'
    },
    cgstRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
},
sgstRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
},
}, {
    timestamps: true
});

module.exports = mongoose.model('RestaurantInfo', restaurantInfoSchema);
