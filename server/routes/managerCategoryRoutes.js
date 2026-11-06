
const express = require('express');
const Category = require('../models/Category');
const Dish = require('../models/Dish');
const protectManager = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protectManager);

// GET: Fetch all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error('Fetch categories error:', error);
        res.status(500).json({ message: 'Unable to fetch categories.' });
    }
});

// POST: Create a category
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                message: 'Category name is required.'
            });
        }

        const cleanName = name.trim();

        const existing = await Category.findOne({
            name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });

        if (existing) {
            return res.status(409).json({
                message: 'This category already exists.'
            });
        }

        const category = await Category.create({ name: cleanName });

        res.status(201).json({
            message: 'Category created successfully.',
            category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ message: 'Unable to create category.' });
    }
});

// PATCH: Rename a category and update its dishes
router.patch('/:categoryId', async (req, res) => {
    try {
        const { name } = req.body;

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                message: 'A valid category name is required.'
            });
        }

        const category = await Category.findById(req.params.categoryId);

        if (!category) {
            return res.status(404).json({
                message: 'Category not found.'
            });
        }

        const cleanName = name.trim();

        const duplicate = await Category.findOne({
            _id: { $ne: category._id },
            name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });

        if (duplicate) {
            return res.status(409).json({
                message: 'Another category already has this name.'
            });
        }

        const oldName = category.name;

        // Update all dishes using the old category name
        await Dish.updateMany(
            { category: oldName },
            { $set: { category: cleanName } }
        );

        category.name = cleanName;
        await category.save();

        res.json({
            message: 'Category renamed successfully.',
            category
        });
    } catch (error) {
        console.error('Rename category error:', error);
        res.status(500).json({ message: 'Unable to rename category.' });
    }
});

// DELETE: Delete a category only when no dishes use it
router.delete('/:categoryId', async (req, res) => {
    try {
        const category = await Category.findById(req.params.categoryId);

        if (!category) {
            return res.status(404).json({
                message: 'Category not found.'
            });
        }

        const assignedDish = await Dish.findOne({
            category: category.name
        });

        if (assignedDish) {
            return res.status(409).json({
                message: 'This category still has dishes. Reassign or archive those dishes before deleting it.'
            });
        }

        await category.deleteOne();

        res.json({
            message: 'Category deleted successfully.'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ message: 'Unable to delete category.' });
    }
});

module.exports = router;
