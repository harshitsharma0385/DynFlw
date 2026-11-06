
const express = require('express');
const router = express.Router();

const RestaurantInfo = require('../models/RestaurantInfo');
const protectManager = require('../middleware/authMiddleware');

router.use(protectManager);

// Get restaurant information
router.get('/', async (req, res) => {
    try {
        let restaurant = await RestaurantInfo.findOne();

        if (!restaurant) {
            restaurant = await RestaurantInfo.create({
                restaurantName: 'My Restaurant'
            });
        }

        res.json(restaurant);

    } catch (error) {
        console.error('Fetch restaurant info error:', error);

        res.status(500).json({
            message: 'Unable to fetch restaurant information.'
        });
    }
});

// Update restaurant information
router.put('/', async (req, res) => {
    try {
        const {
            restaurantName,
            tagline,
            logo,
            phone,
            email,
            address,
            gstin,
            invoiceFooter,
            cgstRate,
            sgstRate
        } = req.body;

        if (!restaurantName || !restaurantName.trim()) {
            return res.status(400).json({
                message: 'Restaurant name is required.'
            });
        }

        const restaurant = await RestaurantInfo.findOneAndUpdate(
            {},
            {
                restaurantName: restaurantName.trim(),
                tagline,
                logo,
                phone,
                email,
                address,
                gstin,
                invoiceFooter,
                cgstRate,
                sgstRate
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.json({
            message: 'Restaurant information saved successfully.',
            restaurant
        });

    } catch (error) {
        console.error('Update restaurant info error:', error);

        res.status(500).json({
            message: 'Unable to save restaurant information.'
        });
    }
});

module.exports = router;
