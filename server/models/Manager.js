const mongoose = require('mongoose');
const managerSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        passwordHash: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ['manager'],
            default: 'manager'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Manager', managerSchema);