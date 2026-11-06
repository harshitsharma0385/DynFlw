
const express = require('express');
const QRCode = require('qrcode');

const Dish = require('../models/Dish');
const Category = require('../models/Category');
const protectManager = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require manager authentication
router.use(protectManager);


// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Escape special regex characters for safe searching
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Find a category without case sensitivity
async function findCategory(categoryName) {
    return Category.findOne({
        name: {
            $regex: `^${escapeRegex(categoryName.trim())}$`,
            $options: 'i'
        }
    });
}


// ==========================================
// GET: FETCH DISHES
// ==========================================

router.get('/', async (req, res) => {
    try {
        const { category, search, archived } = req.query;

        const filter = {};

        // Filter by category
        if (category && category !== 'All') {
            const existingCategory = await findCategory(category);

            if (!existingCategory) {
                return res.status(404).json({
                    message: 'Category not found.'
                });
            }

            filter.category = existingCategory.name;
        }

        // Search by dish name
        if (search && search.trim()) {
            filter.name = {
                $regex: escapeRegex(search.trim()),
                $options: 'i'
            };
        }

        // Archived filter
        if (archived === 'true') {
            filter.isArchived = true;
        } else if (archived !== 'all') {
            filter.isArchived = false;
        }

        const dishes = await Dish.find(filter).sort({
            createdAt: -1
        });

        res.status(200).json(dishes);

    } catch (error) {
        console.error('Manager fetch dishes error:', error);

        res.status(500).json({
            message: 'Unable to fetch dishes.'
        });
    }
});


// ==========================================
// POST: CREATE NEW DISH
// ==========================================

router.post('/', async (req, res) => {
    try {
        const {
            name,
            price,
            description = '',
            image = '',
            category
        } = req.body;

        // Validate required fields
        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof category !== 'string' ||
            !category.trim() ||
            price === undefined ||
            price === null ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
        ) {
            return res.status(400).json({
                message: 'Valid name, price and category are required.'
            });
        }

        if (
            typeof description !== 'string' ||
            typeof image !== 'string'
        ) {
            return res.status(400).json({
                message: 'Description and image must be text.'
            });
        }

        // Verify that the category exists
        const existingCategory = await findCategory(category);

        if (!existingCategory) {
            return res.status(400).json({
                message: 'Please select a valid existing category.'
            });
        }

        // Generate permanent dish URL
        const baseUrl =
            process.env.FRONTEND_URL || 'http://localhost:5173';

        const dish = new Dish({
            name: name.trim(),
            price: Number(price),
            description: description.trim(),
            image: image.trim(),
            category: existingCategory.name
        });

        dish.qrUrl = `${baseUrl}/dish/${dish.dishId}`;

        // Save dish 
        await dish.save();

        // Generate QR code
        const qrCode = await QRCode.toDataURL(dish.qrUrl);

        res.status(201).json({
            message: 'Dish added successfully.',
            dish: {
                ...dish.toObject(),
                qrCode
            }
        });

    } catch (error) {
        console.error('Manager create dish error:', error);

        res.status(500).json({
            message: 'Unable to add dish.'
        });
    }
});


// ==========================================
// PATCH: EDIT DISH
// ==========================================

router.patch('/:dishId', async (req, res) => {
    try {
        const allowedFields = [
            'name',
            'price',
            'description',
            'image',
            'category',
            'isAvailable'
        ];

        const updates = {};

        // Only accept permitted fields
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: 'No valid fields provided.'
            });
        }

        // Validate name
        if (
            updates.name !== undefined &&
            (typeof updates.name !== 'string' || !updates.name.trim())
        ) {
            return res.status(400).json({
                message: 'Dish name cannot be empty.'
            });
        }

        // Validate category
        if (
            updates.category !== undefined &&
            (typeof updates.category !== 'string' || !updates.category.trim())
        ) {
            return res.status(400).json({
                message: 'Category cannot be empty.'
            });
        }

        // Validate price
        if (updates.price !== undefined) {
            if (
                !Number.isFinite(Number(updates.price)) ||
                Number(updates.price) < 0
            ) {
                return res.status(400).json({
                    message: 'Enter a valid price.'
                });
            }

            updates.price = Number(updates.price);
        }

        // Validate description and image
        if (
            updates.description !== undefined &&
            typeof updates.description !== 'string'
        ) {
            return res.status(400).json({
                message: 'Description must be text.'
            });
        }

        if (
            updates.image !== undefined &&
            typeof updates.image !== 'string'
        ) {
            return res.status(400).json({
                message: 'Image must be text.'
            });
        }

        // Validate availability
        if (
            updates.isAvailable !== undefined &&
            typeof updates.isAvailable !== 'boolean'
        ) {
            return res.status(400).json({
                message: 'Availability must be true or false.'
            });
        }

        // Clean text fields
        if (updates.name !== undefined) {
            updates.name = updates.name.trim();
        }

        if (updates.description !== undefined) {
            updates.description = updates.description.trim();
        }

        if (updates.image !== undefined) {
            updates.image = updates.image.trim();
        }

        // Verify updated category
        if (updates.category !== undefined) {
            const existingCategory = await findCategory(updates.category);

            if (!existingCategory) {
                return res.status(400).json({
                    message: 'Please select a valid existing category.'
                });
            }

            updates.category = existingCategory.name;
        }

        // Update dish without changing dishId or qrUrl
        const dish = await Dish.findOneAndUpdate(
            {
                dishId: req.params.dishId,
                isArchived: false
            },
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!dish) {
            return res.status(404).json({
                message: 'Dish not found.'
            });
        }

        res.status(200).json({
            message: 'Dish updated successfully.',
            dish
        });

    } catch (error) {
        console.error('Manager update dish error:', error);

        res.status(500).json({
            message: 'Unable to update dish.'
        });
    }
});

// Restore an archived dish
router.patch('/:dishId/restore', async (req, res) => {
    try {
        const dish = await Dish.findOneAndUpdate(
            {
                dishId: req.params.dishId,
                isArchived: true
            },
            {
                isArchived: false,
                isAvailable: true
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!dish) {
            return res.status(404).json({
                message: 'Archived dish not found.'
            });
        }

        res.json({
            message: 'Dish restored successfully.',
            dish
        });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to restore dish.',
            error: error.message
        });
    }
});

// ==========================================
// PATCH: ARCHIVE DISH
// ==========================================

router.patch('/:dishId/archive', async (req, res) => {
    try {
        const dish = await Dish.findOneAndUpdate(
            {
                dishId: req.params.dishId,
                isArchived: false
            },
            {
                $set: {
                    isArchived: true,
                    isAvailable: false
                }
            },
            {
                new: true
            }
        );

        if (!dish) {
            return res.status(404).json({
                message: 'Dish not found.'
            });
        }

        res.status(200).json({
            message: 'Dish archived successfully.',
            dish
        });

    } catch (error) {
        console.error('Manager archive dish error:', error);

        res.status(500).json({
            message: 'Unable to archive dish.'
        });
    }
});


// ==========================================
// GET: GENERATE DISH QR CODE
// ==========================================

router.get('/:dishId/qr', async (req, res) => {
    try {
        const dish = await Dish.findOne({
            dishId: req.params.dishId,
            isArchived: false
        });

        if (!dish) {
            return res.status(404).json({
                message: 'Dish not found.'
            });
        }

        const qrCode = await QRCode.toDataURL(dish.qrUrl);

        res.status(200).json({
            qrUrl: dish.qrUrl,
            qrCode
        });

    } catch (error) {
        console.error('Manager QR generation error:', error);

        res.status(500).json({
            message: 'Unable to generate QR code.'
        });
    }
});


module.exports = router;
