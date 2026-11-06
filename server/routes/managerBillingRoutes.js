
const express = require("express");

const Table = require("../models/Table");
const TableSession = require("../models/TableSession");
const Order = require("../models/Order");
const RestaurantInfo = require("../models/RestaurantInfo");
const protectManager = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protectManager);

// Emit table status updates
const emitTableUpdate = (req, table) => {
    const io = req.app.get("io");

    if (io) {
        io.emit("table-status-updated", {
            action: "updated",
            tableId: table.tableId,
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            status: table.status,
            isActive: table.isActive
        });
    }
};

// Get restaurant information
const getRestaurantInfo = async () => {
    let restaurant = await RestaurantInfo.findOne();

    if (!restaurant) {
        restaurant = await RestaurantInfo.create({
            restaurantName: "My Restaurant"
        });
    }

    return restaurant;
};

// Consolidate items across all orders
const consolidateItems = (orders) => {
    const consolidatedItems = {};

    orders.forEach(order => {
        order.items.forEach(item => {
            const key = `${item.dishId}_${item.price}`;

            if (!consolidatedItems[key]) {
                consolidatedItems[key] = {
                    dishId: item.dishId,
                    name: item.name,
                    price: item.price,
                    quantity: 0,
                    total: 0
                };
            }

            consolidatedItems[key].quantity += item.quantity;
            consolidatedItems[key].total += item.price * item.quantity;
        });
    });

    return Object.values(consolidatedItems).map(item => ({
        ...item,
        total: Number(item.total.toFixed(2))
    }));
};

// Calculate subtotal, GST and grand total
const calculateBill = (items, restaurant) => {
    const subtotal = Number(
        items.reduce((sum, item) => sum + item.total, 0).toFixed(2)
    );

    const cgstRate = Number(restaurant.cgstRate || 0);
    const sgstRate = Number(restaurant.sgstRate || 0);

    const cgstAmount = Number(
        (subtotal * cgstRate / 100).toFixed(2)
    );

    const sgstAmount = Number(
        (subtotal * sgstRate / 100).toFixed(2)
    );

    const total = Number(
        (subtotal + cgstAmount + sgstAmount).toFixed(2)
    );

    return {
        subtotal,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        total
    };
};

// GET CURRENT BILL
router.get("/tables/:tableId/current", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId,
            isActive: true
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        const session = await TableSession.findOne({
            tableId: table.tableId,
            status: "active"
        });

        if (!session) {
            return res.status(404).json({
                message: "No active session found for this table."
            });
        }

        const orders = await Order.find({
            tableSessionId: session.sessionId,
            status: { $ne: "cancelled" }
        }).sort({ createdAt: -1 });

        const items = consolidateItems(orders);
        const restaurant = await getRestaurantInfo();
        const bill = calculateBill(items, restaurant);

        res.json({
            table: {
                tableId: table.tableId,
                tableNumber: table.tableNumber
            },
            session,
            orders,
            items,
            restaurant: restaurant.toObject(),
            ...bill
        });

    } catch (error) {
        console.error("Fetch current bill error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// END TABLE SESSION
router.post("/tables/:tableId/end-session", async (req, res) => {
    try {
        const { force } = req.body;

        const table = await Table.findOne({
            tableId: req.params.tableId,
            isActive: true
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        const session = await TableSession.findOne({
            tableId: table.tableId,
            status: "active"
        });

        if (!session) {
            return res.status(404).json({
                message: "No active session found."
            });
        }

        const orders = await Order.find({
            tableSessionId: session.sessionId,
            status: { $ne: "cancelled" }
        });

        const unpaidOrders = orders.filter(
            order => order.paymentStatus !== "paid"
        );

        const unfinishedOrders = orders.filter(
            order => order.status !== "served"
        );

        if (
            (unpaidOrders.length > 0 || unfinishedOrders.length > 0) &&
            force !== true
        ) {
            return res.status(409).json({
                message: "This session has unpaid or unserved orders. Confirm to force-close it.",
                unpaidOrders: unpaidOrders.length,
                unfinishedOrders: unfinishedOrders.length,
                requiresConfirmation: true
            });
        }

        session.status = "closed";
        session.closedAt = new Date();
        await session.save();

        table.status = "available";
        await table.save();

        emitTableUpdate(req, table);

        res.json({
            message: "Table session ended successfully.",
            tableNumber: table.tableNumber,
            sessionId: session.sessionId,
            closedAt: session.closedAt,
            unpaidOrders: unpaidOrders.length,
            unfinishedOrders: unfinishedOrders.length
        });

    } catch (error) {
        console.error("End table session error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// DISMISS EMPTY OR STALE TABLE
router.post("/tables/:tableId/dismiss", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId,
            isActive: true
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        const session = await TableSession.findOne({
            tableId: table.tableId,
            status: "active"
        });

        if (!session) {
            table.status = "available";
            await table.save();

            emitTableUpdate(req, table);

            return res.json({
                message: "Stale table entry dismissed."
            });
        }

        const orderCount = await Order.countDocuments({
            tableSessionId: session.sessionId
        });

        if (orderCount > 0) {
            return res.status(409).json({
                message: "This session contains order history and cannot be dismissed. Please manage it through billing."
            });
        }

        session.status = "closed";
        session.closedAt = new Date();
        await session.save();

        table.status = "available";
        await table.save();

        emitTableUpdate(req, table);

        res.json({
            message: `Empty session for Table ${table.tableNumber} dismissed successfully.`
        });

    } catch (error) {
        console.error("Dismiss table error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// CHECKOUT
router.post("/tables/:tableId/checkout", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId,
            isActive: true
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        const session = await TableSession.findOne({
            tableId: table.tableId,
            status: "active"
        });

        if (!session) {
            return res.status(404).json({
                message: "No active session found."
            });
        }

        const orders = await Order.find({
            tableSessionId: session.sessionId,
            status: { $ne: "cancelled" }
        });

        if (orders.length === 0) {
            return res.status(400).json({
                message: "There are no billable orders for this session."
            });
        }

        const unfinishedOrders = orders.filter(
            order => order.status !== "served"
        );

        if (unfinishedOrders.length > 0) {
            return res.status(409).json({
                message: "All orders must be served before checkout.",
                unfinishedOrders: unfinishedOrders.map(order => ({
                    orderId: order.orderId,
                    status: order.status
                }))
            });
        }

        const items = consolidateItems(orders);
        const restaurant = await getRestaurantInfo();
        const bill = calculateBill(items, restaurant);

        await Order.updateMany(
            {
                tableSessionId: session.sessionId,
                status: { $ne: "cancelled" }
            },
            {
                $set: { paymentStatus: "paid" }
            }
        );

        session.status = "closed";
        session.closedAt = new Date();
        await session.save();

        table.status = "available";
        await table.save();

        emitTableUpdate(req, table);

        res.json({
            message: "Checkout successful. Table session closed.",
            tableNumber: table.tableNumber,
            sessionId: session.sessionId,
            restaurant: restaurant.toObject(),
            ...bill,
            paymentStatus: "paid",
            closedAt: session.closedAt
        });

    } catch (error) {
        console.error("Checkout error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;
