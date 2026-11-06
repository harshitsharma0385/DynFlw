require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Dish = require('./models/Dish');
const QRCode = require('qrcode');
const { randomUUID } = require('crypto');
const Order = require('./models/Order');
const Table = require('./models/Table');
const TableSession = require('./models/TableSession');
const authRoutes = require('./routes/auth');
const protectManager = require('./middleware/authMiddleware');
const managerDishRoutes = require('./routes/managerDishRoutes');
const managerCategoryRoutes = require('./routes/managerCategoryRoutes');
const managerTableRoutes = require('./routes/managerTableRoutes');
const managerBillingRoutes = require("./routes/managerBillingRoutes");
const managerRestaurantInfoRoutes = require('./routes/managerRestaurantInfoRoutes');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/manager/dishes', managerDishRoutes);
app.use('/api/manager/categories', managerCategoryRoutes);
app.use('/api/manager/tables', managerTableRoutes);
app.use('/api/manager/billing', managerBillingRoutes);
app.use('/api/manager/restaurant-info', managerRestaurantInfoRoutes);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PATCH']
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Kitchen client connected: ', socket.id);

    socket.on('disconnect', () => {
        console.log('Kitchen client disconnected: ', socket.id);
    });
});

app.set('io', io);

// Generate permanent dish QR URL
function getDishUrl(dishId) {
    return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dish/${dishId}`;
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'DynFlw API is running!'
    });
});


// ==========================================
// DISH ROUTES
// ==========================================

// Create dish
app.post('/api/dishes', async (req, res) => {
    try {
        const { name, price, description, image, category } = req.body;

        if (!name || price === undefined || !category) {
            return res.status(400).json({
                message: 'Name, price, and category are required.'
            });
        }

        const dishId = randomUUID();
        const qrUrl = getDishUrl(dishId);

        const dish = new Dish({
            dishId,
            qrUrl,
            name,
            price,
            description,
            image,
            category
        });

        const qrCode = await QRCode.toDataURL(qrUrl);

        await dish.save();

        res.status(201).json({
            message: 'Dish created successfully',
            dish: {
                ...dish.toObject(),
                qrCode
            }
        });

    } catch (error) {
        console.error('Create dish error:', error);

        res.status(500).json({
            message: 'Failed to create dish',
            error: error.message
        });
    }
});

// Get all active dishes
app.get('/api/dishes', async (req, res) => {
    try {
        const dishes = await Dish.find({
            isArchived: false
        });

        res.json(dishes);

    } catch (error) {
        console.error('Fetch dishes error:', error);

        res.status(500).json({
            message: 'Unable to fetch dishes',
            error: error.message
        });
    }
});

// Get individual dish
app.get('/api/dishes/:dishId', async (req, res) => {
    try {
        const dish = await Dish.findOne({
            dishId: req.params.dishId
        });

        if (!dish) {
            return res.status(404).json({
                message: 'Dish not found'
            });
        }

        res.json(dish);

    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch dish'
        });
    }
});


// ==========================================
// ORDER ROUTES
// ==========================================

// Place order
app.post('/api/orders', async (req, res) => {
    try {
        const {
            items,
            tableSessionId,
            specialInstructions = ''
        } = req.body;

        // Validate cart
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: 'Your cart is empty.'
            });
        }

        // Validate dining session ID
        if (!tableSessionId) {
            return res.status(400).json({
                message: 'Table session is required.'
            });
        }

        // Validate order-wide special instructions
        if (
            typeof specialInstructions !== 'string' ||
            specialInstructions.length > 500
        ) {
            return res.status(400).json({
                message: 'Special instructions must be text with a maximum of 500 characters.'
            });
        }

        const cleanedInstructions = specialInstructions.trim();

        // Find active dining session
        const session = await TableSession.findOne({
            sessionId: tableSessionId,
            status: 'active'
        });

        if (!session) {
            return res.status(400).json({
                message: 'Your dining session is invalid or has expired. Please scan the table QR code again.'
            });
        }

        // Verify associated table
        const table = await Table.findOne({
            tableId: session.tableId,
            isActive: true,
            status: { $ne: 'disabled'}
        });

        if (!table) {
            return res.status(400).json({
                message: 'This table is currently unavailable.'
            });
        }

        // Validate and fetch dishes
        const orderItems = [];

        for (const item of items) {
            if (
                !item.dishId ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1
            ) {
                return res.status(400).json({
                    message: 'Invalid order item.'
                });
            }

            const dish = await Dish.findOne({
                dishId: item.dishId,
                isAvailable: true,
                isArchived: false
            });

            if (!dish) {
                return res.status(400).json({
                    message: 'A dish in your order is unavailable.'
                });
            }

            orderItems.push({
                dishId: dish.dishId,
                name: dish.name,
                price: dish.price,
                quantity: item.quantity
            });
        }

        // Calculate total using trusted database prices
        const total = orderItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        // Create order
        const order = await Order.create({
            tableId: table.tableId,
            tableNumber: table.tableNumber,
            tableSessionId: session.sessionId,
            items: orderItems,
            specialInstructions: cleanedInstructions,
            total
        });

        // Mark table as occupied after successful order placement
        if (table.status !== 'occupied') {
            table.status = 'occupied';
            await table.save();
            io.emit('table-status-updated', {
                tableId: table.tableId,
                tableNumber: table.tableNumber,
                status: table.status,
                isActive: table.isActive
            });
        }

        // Notify Kitchen Display
        io.emit('new-order', order);

        res.status(201).json({
            message: 'Order placed successfully!',
            order
        });

    } catch (error) {
        console.error('Place order error:', error);

        res.status(500).json({
            message: 'Unable to place your order.'
        });
    }
});

// Get all orders
// Get active kitchen orders and recently served orders
app.get('/api/orders', async (req, res) => {
    try {
        const thirtySecondsAgo = new Date(Date.now() - 30000);

        const orders = await Order.find({
            $or: [
                // Always show orders still being processed
                {
                    status: {
                        $in: ['received', 'preparing', 'ready']
                    }
                },

                // Show served orders for only 30 seconds
                {
                    status: 'served',
                    updatedAt: { $gte: thirtySecondsAgo }
                }
            ]
        }).sort({
            createdAt: -1
        });

        res.json(orders);

    } catch (error) {
        console.error('Fetch orders error:', error);

        res.status(500).json({
            message: 'Unable to fetch orders'
        });
    }
});

// Update order status
app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            'received',
            'preparing',
            'ready',
            'served',
            'cancelled'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: 'Invalid order status.'
            });
        }

        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                message: 'Order not found.'
            });
        }

        io.emit('order-status-updated', order);

        res.json({
            message: 'Order status updated successfully.',
            order
        });

    } catch (error) {
        console.error('Update order status error: ', error);

        res.status(500).json({
            message: 'Unable to update order status.'
        });
    }
});


// ==========================================
// TABLE ROUTES
// ==========================================

// Create table
app.post('/api/tables', async (req, res) => {
    try {
        const { tableNumber, capacity = 4 } = req.body;

        if (
            !Number.isInteger(tableNumber) ||
            tableNumber < 1 ||
            !Number.isInteger(capacity) ||
            capacity < 1
        ) {
            return res.status(400).json({
                message: 'Valid table number and capacity are required.'
            });
        }

        const existingTable = await Table.findOne({ tableNumber });

        if (existingTable) {
            return res.status(409).json({
                message: 'Table number already exists.'
            });
        }

        const table = new Table({
            tableNumber,
            capacity
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        table.qrUrl = `${baseUrl}/t/${table.qrToken}`;

        await table.save();

        const qrCode = await QRCode.toDataURL(table.qrUrl);

        res.status(201).json({
            message: 'Table created successfully.',
            table,
            qrCode
        });

    } catch (error) {
        console.error('Create table error:', error);

        res.status(500).json({
            message: 'Unable to create table.'
        });
    }
});

// Get all tables
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await Table.find().sort({
            tableNumber: 1
        });

        res.json(tables);

    } catch (error) {
        console.error('Fetch tables error: ', error);

        res.status(500).json({
            message: 'Unable to fetch tables.'
        });
    }
});

// Identify table using QR token
app.get('/api/tables/qr/:qrToken', async (req, res) => {
    try {
        const table = await Table.findOne({
            qrToken: req.params.qrToken,
            isActive: true
        }).select('tableId tableNumber capacity status');

        if (!table) {
            return res.status(404).json({
                message: 'Invalid or inactive table QR code.'
            });
        }

        if (table.status === 'disabled') {
            return res.status(403).json({
                message: 'This table is currently unavailable.'
            });
        }

        res.json({
            message: 'Table identified successfully.',
            table
        });

    } catch (error) {
        console.error('Identify table error: ', error);

        res.status(500).json({
            message: 'Unable to identify table.'
        });
    }
});

// Start or retrieve table session
app.post('/api/tables/qr/:qrToken/session', async (req, res) => {
    try {
        const table = await Table.findOne({
            qrToken: req.params.qrToken,
            isActive: true,
            status: { $ne: 'disabled' }
        });

        if (!table) {
            return res.status(404).json({
                message: 'Invalid or inactive table QR code.'
            });
        }

        let session = await TableSession.findOne({
            tableId: table.tableId,
            status: 'active'
        });

        if (!session) {
            session = await TableSession.create({
                tableId: table.tableId,
                tableNumber: table.tableNumber
            });
        }

        // if (table.status != 'occupied') {
        //     table.status = 'occupied';
        //     await table.save();
        // }

        res.status(200).json({
            message: 'Table session retrieved successfully.',
            table: {
                tableId: table.tableId,
                tableNumber: table.tableNumber
            },
            session
        });

    } catch (error) {
        console.error('Table session error: ', error);

        res.status(500).json({
            message: 'Unable to start table session.'
        });
    }
});

app.get('/api/manager/test', protectManager, (req,res) =>{
    res.json({
        message: 'Manager authentication successful',
        manager: req.manager
    });
});

// ==========================================
// SERVER STARTUP
// ==========================================

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('Connected to MongoDB');

        server.listen(PORT, () => {
            console.log(`DynFlw server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

startServer();
