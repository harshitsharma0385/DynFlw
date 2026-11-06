
const express = require("express");
const QRCode = require("qrcode");

const Table = require("../models/Table");
const TableSession = require("../models/TableSession");
const Order = require("../models/Order");
const protectManager = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protectManager);

// ==========================================
// SOCKET.IO HELPER
// ==========================================

function emitTableUpdate(req, table, action = "updated") {
    const io = req.app.get("io");

    if (io) {
        io.emit("table-status-updated", {
            action,
            tableId: table.tableId,
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            status: table.status,
            isActive: table.isActive
        });
    }
}

// Check whether a table has an active session
async function hasActiveSession(tableId) {
    return !!(await TableSession.exists({
        tableId,
        status: "active"
    }));
}

// Check for orders still requiring attention
async function hasPendingOrders(tableId) {
    return !!(await Order.exists({
        tableId,
        status: { $in: ["received", "preparing", "ready"] }
    }));
}

// ==========================================
// GET ALL TABLES
// ==========================================

router.get("/", async (req, res) => {
    try {
        const tables = await Table.find().sort({
            tableNumber: 1
        });

        res.json({ tables });

    } catch (error) {
        console.error("Fetch tables error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ==========================================
// CREATE TABLE
// ==========================================

router.post("/", async (req, res) => {
    try {
        const { tableNumber, capacity = 4 } = req.body;

        if (
            !Number.isInteger(tableNumber) ||
            tableNumber < 1 ||
            !Number.isInteger(capacity) ||
            capacity < 1
        ) {
            return res.status(400).json({
                message: "Valid table number and capacity are required."
            });
        }

        const existing = await Table.findOne({ tableNumber });

        if (existing) {
            return res.status(409).json({
                message: "This table number already exists."
            });
        }

        const table = new Table({
            tableNumber,
            capacity
        });

        const baseUrl =
            process.env.FRONTEND_URL || "http://localhost:5173";

        table.qrUrl = `${baseUrl}/t/${table.qrToken}`;

        await table.save();

        // Notify connected clients
        emitTableUpdate(req, table, "created");

        res.status(201).json({
            message: "Table created successfully.",
            table
        });

    } catch (error) {
        console.error("Create table error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ==========================================
// EDIT TABLE DETAILS AND STATUS
// ==========================================

router.patch("/:tableId", async (req, res) => {
    try {
        const { tableNumber, capacity, status } = req.body;

        const table = await Table.findOne({
            tableId: req.params.tableId
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        if (
            !Number.isInteger(tableNumber) ||
            tableNumber < 1 ||
            !Number.isInteger(capacity) ||
            capacity < 1
        ) {
            return res.status(400).json({
                message: "Valid table number and capacity are required."
            });
        }

        if (!["available", "occupied", "disabled"].includes(status)) {
            return res.status(400).json({
                message: "Invalid table status."
            });
        }

        const duplicate = await Table.findOne({
            tableNumber,
            tableId: { $ne: table.tableId }
        });

        if (duplicate) {
            return res.status(409).json({
                message: "That table number is already in use."
            });
        }

        const activeSession = await hasActiveSession(table.tableId);

        if (activeSession && status !== "occupied") {
            return res.status(409).json({
                message: "This table has an active session. Close the session before changing its status."
            });
        }

        table.tableNumber = tableNumber;
        table.capacity = capacity;
        table.status = status;

        await table.save();

        // Notify connected clients
        emitTableUpdate(req, table, "updated");

        res.json({
            message: "Table updated successfully.",
            table
        });

    } catch (error) {
        console.error("Update table error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ==========================================
// DOWNLOAD TABLE QR CODE
// ==========================================

router.get("/:tableId/qr", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        const qrCode = await QRCode.toDataURL(table.qrUrl);

        res.json({
            qrUrl: table.qrUrl,
            qrCode
        });

    } catch (error) {
        console.error("Generate table QR error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ==========================================
// ARCHIVE TABLE
// ==========================================

router.patch("/:tableId/archive", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId,
            isActive: true
        });

        if (!table) {
            return res.status(404).json({
                message: "Active table not found."
            });
        }

        if (
            table.status === "occupied" ||
            await hasActiveSession(table.tableId) ||
            await hasPendingOrders(table.tableId)
        ) {
            return res.status(409).json({
                message: "Cannot archive a table with an active session or pending orders."
            });
        }

        table.isActive = false;
        table.status = "disabled";

        await table.save();

        // Notify connected clients
        emitTableUpdate(req, table, "archived");

        res.json({
            message: "Table archived successfully.",
            table
        });

    } catch (error) {
        console.error("Archive table error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ==========================================
// RESTORE TABLE
// ==========================================

router.patch("/:tableId/restore", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId,
            isActive: false
        });

        if (!table) {
            return res.status(404).json({
                message: "Archived table not found."
            });
        }

        table.isActive = true;
        table.status = "available";

        await table.save();

        // Notify connected clients
        emitTableUpdate(req, table, "restored");

        res.json({
            message: "Table restored successfully.",
            table
        });

    } catch (error) {
        console.error("Restore table error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ==========================================
// PERMANENTLY DELETE TABLE
// ==========================================

router.delete("/:tableId", async (req, res) => {
    try {
        const table = await Table.findOne({
            tableId: req.params.tableId
        });

        if (!table) {
            return res.status(404).json({
                message: "Table not found."
            });
        }

        if (
            await hasActiveSession(table.tableId) ||
            await hasPendingOrders(table.tableId)
        ) {
            return res.status(409).json({
                message: "Cannot remove a table with an active session or pending orders."
            });
        }

        // Notify connected clients before deleting
        const io = req.app.get("io");

        if (io) {
            io.emit("table-status-updated", {
                action: "deleted",
                tableId: table.tableId,
                tableNumber: table.tableNumber,
                isDeleted: true
            });
        }

        await Table.deleteOne({
            tableId: table.tableId
        });

        res.json({
            message: "Table permanently removed."
        });

    } catch (error) {
        console.error("Delete table error:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;
