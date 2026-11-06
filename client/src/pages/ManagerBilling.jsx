
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import API_BASE_URL from "../config/api";

function ManagerBilling() {
    const [tables, setTables] = useState([]);
    const [bills, setBills] = useState({});
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedBill, setSelectedBill] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const [loading, setLoading] = useState(true);
    const [billLoading, setBillLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [endingSession, setEndingSession] = useState(false);
    const [dismissingTableId, setDismissingTableId] = useState(null);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const selectedTableRef = useRef(null);
    const selectedSessionRef = useRef(null);

    useEffect(() => {
        selectedTableRef.current = selectedTable;
        selectedSessionRef.current = selectedBill?.session?.sessionId || null;
    }, [selectedTable, selectedBill]);

    // API REQUEST HELPER
    const apiRequest = useCallback(async (endpoint, options = {}) => {
        const currentToken = localStorage.getItem("managerToken");

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    }, []);

    // CLOSE BILL MODAL
    const closeBill = () => {
        setSelectedTable(null);
        setSelectedBill(null);
        setShowReceipt(false);
    };

    // FETCH TABLES AND BILLS
    const fetchBillingData = useCallback(async () => {
        try {
            setError("");

            const data = await apiRequest("/api/manager/tables");

            const occupiedTables = (data.tables || []).filter(
                table => table.isActive && table.status === "occupied"
            );

            setTables(occupiedTables);

            const billResults = await Promise.all(
                occupiedTables.map(async table => {
                    try {
                        const bill = await apiRequest(
                            `/api/manager/billing/tables/${table.tableId}/current`
                        );

                        return [table.tableId, bill];
                    } catch (err) {
                        console.error(
                            `Could not fetch bill for Table ${table.tableNumber}:`,
                            err
                        );

                        return [table.tableId, null];
                    }
                })
            );

            const updatedBills = Object.fromEntries(billResults);
            setBills(updatedBills);

            const currentTable = selectedTableRef.current;

            if (currentTable) {
                const refreshedBill = updatedBills[currentTable.tableId];

                if (refreshedBill) {
                    setSelectedBill(refreshedBill);
                } else {
                    closeBill();
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [apiRequest]);

    useEffect(() => {
        fetchBillingData();
    }, [fetchBillingData]);

    // SOCKET UPDATES
    useEffect(() => {
        const socket = io(API_BASE_URL);

        const handleTableUpdate = () => {
            fetchBillingData();
        };

        const handleNewOrder = async () => {
            await fetchBillingData();

            const currentTable = selectedTableRef.current;

            if (currentTable) {
                try {
                    const bill = await apiRequest(
                        `/api/manager/billing/tables/${currentTable.tableId}/current`
                    );

                    setSelectedBill(bill);
                } catch (err) {
                    console.error("Could not refresh selected bill:", err);
                }
            }
        };

        const handleOrderUpdate = updatedOrder => {
            const currentSession = selectedSessionRef.current;

            if (
                updatedOrder &&
                updatedOrder.orderId &&
                updatedOrder.tableSessionId === currentSession
            ) {
                setSelectedBill(previousBill => {
                    if (!previousBill) return previousBill;

                    return {
                        ...previousBill,
                        orders: previousBill.orders.map(order =>
                            order.orderId === updatedOrder.orderId
                                ? { ...order, ...updatedOrder }
                                : order
                        )
                    };
                });
            } else if (selectedTableRef.current) {
                const currentTable = selectedTableRef.current;

                apiRequest(
                    `/api/manager/billing/tables/${currentTable.tableId}/current`
                )
                    .then(setSelectedBill)
                    .catch(err => console.error(err));
            }

            fetchBillingData();
        };

        socket.on("table-status-updated", handleTableUpdate);
        socket.on("new-order", handleNewOrder);
        socket.on("order-status-updated", handleOrderUpdate);

        return () => {
            socket.off("table-status-updated", handleTableUpdate);
            socket.off("new-order", handleNewOrder);
            socket.off("order-status-updated", handleOrderUpdate);
            socket.disconnect();
        };
    }, [fetchBillingData, apiRequest]);

    // OPEN BILL
    const openBill = async table => {
        try {
            setBillLoading(true);
            setError("");
            setMessage("");

            const bill = await apiRequest(
                `/api/manager/billing/tables/${table.tableId}/current`
            );

            setSelectedTable(table);
            setSelectedBill(bill);

        } catch (err) {
            setError(err.message);
        } finally {
            setBillLoading(false);
        }
    };

    // CHANGE ORDER STATUS
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            setUpdatingOrderId(orderId);
            setError("");
            setMessage("");

            await apiRequest(`/api/orders/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus })
            });

            setSelectedBill(previousBill => {
                if (!previousBill) return previousBill;

                return {
                    ...previousBill,
                    orders: previousBill.orders.map(order =>
                        order.orderId === orderId
                            ? { ...order, status: newStatus }
                            : order
                    )
                };
            });

            setMessage(`Order status updated to ${newStatus}.`);

        } catch (err) {
            setError(err.message);
        } finally {
            setUpdatingOrderId(null);
        }
    };

    // DISMISS TABLE
    const handleDismissTable = async table => {
        const confirmed = window.confirm(
            `Dismiss the empty or stale entry for Table ${table.tableNumber}?\n\nEntries containing order history cannot be dismissed.`
        );

        if (!confirmed) return;

        try {
            setDismissingTableId(table.tableId);
            setError("");
            setMessage("");

            const result = await apiRequest(
                `/api/manager/billing/tables/${table.tableId}/dismiss`,
                { method: "POST" }
            );

            setMessage(result.message);

            if (selectedTable?.tableId === table.tableId) {
                closeBill();
            }

            await fetchBillingData();

        } catch (err) {
            setError(err.message);
        } finally {
            setDismissingTableId(null);
        }
    };

    // CHECKOUT
    const handleCheckout = async () => {
        if (!selectedTable || !selectedBill) return;

        const confirmed = window.confirm(
            `Confirm checkout for Table ${selectedTable.tableNumber}?\n\nGrand Total: ${formatCurrency(selectedBill.total)}`
        );

        if (!confirmed) return;

        try {
            setCheckoutLoading(true);
            setError("");
            setMessage("");

            const result = await apiRequest(
                `/api/manager/billing/tables/${selectedTable.tableId}/checkout`,
                { method: "POST" }
            );

            setMessage(
                `Checkout successful! Table ${result.tableNumber} is now available.`
            );

            closeBill();

            await fetchBillingData();

        } catch (err) {
            setError(err.message);
        } finally {
            setCheckoutLoading(false);
        }
    };

    // END SESSION
    const handleEndSession = async () => {
        if (!selectedTable || !selectedBill) return;

        const confirmed = window.confirm(
            `Are you sure you want to end the session for Table ${selectedTable.tableNumber}?\n\nThis will make the table available again.`
        );

        if (!confirmed) return;

        try {
            setEndingSession(true);
            setError("");
            setMessage("");

            let result;

            try {
                result = await apiRequest(
                    `/api/manager/billing/tables/${selectedTable.tableId}/end-session`,
                    {
                        method: "POST",
                        body: JSON.stringify({ force: false })
                    }
                );
            } catch (err) {
                const forceConfirmed = window.confirm(
                    `${err.message}\n\nEnd the session anyway? Unpaid orders will remain unpaid.`
                );

                if (!forceConfirmed) return;

                result = await apiRequest(
                    `/api/manager/billing/tables/${selectedTable.tableId}/end-session`,
                    {
                        method: "POST",
                        body: JSON.stringify({ force: true })
                    }
                );
            }

            setMessage(
                `Session ended successfully. Table ${result.tableNumber} is now available.`
            );

            closeBill();

            await fetchBillingData();

        } catch (err) {
            setError(err.message);
        } finally {
            setEndingSession(false);
        }
    };

    // BILL HELPERS
    const billableOrders = selectedBill?.orders?.filter(
        order => order.status !== "cancelled"
    ) || [];

    const allOrdersServed = billableOrders.length > 0 &&
        billableOrders.every(order => order.status === "served");

    const totalOccupied = tables.length;

    const formatCurrency = amount =>
        `₹${Number(amount || 0).toFixed(2)}`;

    const restaurant = selectedBill?.restaurant || {};

    const restaurantName = restaurant.restaurantName || "My Restaurant";
    const restaurantAddress = restaurant.address || "";
    const restaurantPhone = restaurant.phone || "";
    const restaurantEmail = restaurant.email || "";
    const restaurantGSTIN = restaurant.gstin || "";
    const restaurantTagline = restaurant.tagline || "";
    const invoiceFooter = restaurant.invoiceFooter || "Thank you for dining with us!";

    const subtotal = Number(selectedBill?.subtotal || 0);
    const cgstRate = Number(selectedBill?.cgstRate || 0);
    const cgstAmount = Number(selectedBill?.cgstAmount || 0);
    const sgstRate = Number(selectedBill?.sgstRate || 0);
    const sgstAmount = Number(selectedBill?.sgstAmount || 0);
    const grandTotal = Number(selectedBill?.total || 0);

    // STYLES
    const styles = {
        page: {
            padding: "30px",
            maxWidth: "1200px",
            margin: "0 auto",
            color: "#222",
            fontFamily: "Arial, sans-serif"
        },
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
            marginBottom: "25px"
        },
        button: {
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600"
        },
        summary: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "30px"
        },
        summaryCard: {
            background: "#f5f5f5",
            padding: "20px",
            borderRadius: "12px"
        },
        tableGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "18px"
        },
        tableCard: {
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
            background: "#fff"
        },
        table: {
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "15px"
        },
        cell: {
            padding: "12px 8px",
            borderBottom: "1px solid #eee",
            textAlign: "left"
        }
    };

    if (loading) {
        return (
            <div style={{color:"white", padding: "30%"}}>
                <h2>Loading billing dashboard...</h2>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <style>{`
                .billing-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 24px;
                    background: rgba(24, 17, 14, 0.68);
                    backdrop-filter: blur(4px);
                    overflow-y: auto;
                }

                .billing-modal {
                    position: relative;
                    width: 100%;
                    max-width: 950px;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 30px;
                    border-radius: 16px;
                    background: #fff;
                    color: #222;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                    animation: billingModalIn 0.2s ease-out;
                }

                .billing-modal-close {
                    position: sticky;
                    top: 0;
                    float: right;
                    z-index: 2;
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 50%;
                    background: #eee;
                    color: #222;
                    font-size: 21px;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .billing-modal-close:hover {
                    background: #ddd;
                }

                @keyframes billingModalIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .receipt-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.7);
                    overflow-y: auto;
                }

                @media (max-width: 650px) {
                    .billing-modal-overlay {
                        padding: 10px;
                        align-items: flex-start;
                    }

                    .billing-modal {
                        margin: auto 0;
                        max-height: 95vh;
                        padding: 18px;
                    }
                }

                @media print {
                    body * {
                        visibility: hidden !important;
                    }

                    #dynflw-receipt,
                    #dynflw-receipt * {
                        visibility: visible !important;
                    }

                    #dynflw-receipt {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 72mm !important;
                        max-width: 72mm !important;
                        margin: 0 !important;
                        padding: 3mm !important;
                        box-sizing: border-box !important;
                        background: white !important;
                    }

                    .receipt-actions {
                        display: none !important;
                    }

                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
            `}</style>

            {/* HEADER */}
            <div style={styles.header}>
                <div>
                    <h1 style={{ margin: 0, color: "white" }}>Billing</h1>
                    <p style={{ color: "#777" }}>
                        Manage table bills and checkout.
                    </p>
                </div>

                <button
                    style={{
                        ...styles.button,
                        background: "#222",
                        color: "#fff"
                    }}
                    onClick={fetchBillingData}
                >
                    Refresh
                </button>
            </div>

            {/* MESSAGES */}
            {error && (
                <div style={{
                    padding: "12px",
                    background: "#ffe5e5",
                    color: "#b00020",
                    borderRadius: "8px",
                    marginBottom: "15px"
                }}>
                    {error}
                </div>
            )}

            {message && (
                <div style={{
                    padding: "12px",
                    background: "#e5f7e9",
                    color: "#187333",
                    borderRadius: "8px",
                    marginBottom: "15px"
                }}>
                    {message}
                </div>
            )}

            {/* SUMMARY */}
            <div style={styles.summary}>
                <div style={styles.summaryCard}>
                    <p style={{ color: "#777", margin: 0 }}>
                        Occupied Tables
                    </p>
                    <h2>{totalOccupied}</h2>
                </div>

                <div style={styles.summaryCard}>
                    <p style={{ color: "#777", margin: 0 }}>
                        Active Bills
                    </p>
                    <h2>{Object.values(bills).filter(Boolean).length}</h2>
                </div>
            </div>

            {/* OCCUPIED TABLES */}
            <h2 style={{color: "white"}}>Occupied Tables</h2>

            {tables.length === 0 ? (
                <div style={{
                    padding: "30px",
                    background: "#f5f5f5",
                    borderRadius: "12px",
                    textAlign: "center"
                }}>
                    <h3>No occupied tables</h3>
                    <p style={{ color: "#777" }}>
                        Tables will appear here once customers place orders.
                    </p>
                </div>
            ) : (
                <div style={styles.tableGrid}>
                    {tables.map(table => {
                        const bill = bills[table.tableId];

                        return (
                            <div
                                key={table.tableId}
                                style={{
                                    ...styles.tableCard,
                                    borderTop: "4px solid #dc3545"
                                }}
                            >
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <h3>Table {table.tableNumber}</h3>

                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px"
                                    }}>
                                        <span style={{
                                            color: "#dc3545",
                                            fontSize: "13px",
                                            fontWeight: "bold"
                                        }}>
                                            OCCUPIED
                                        </span>

                                        <button
                                            title="Dismiss empty or stale entry"
                                            disabled={dismissingTableId === table.tableId}
                                            onClick={() => handleDismissTable(table)}
                                            style={{
                                                border: "none",
                                                background: "#ffe5e5",
                                                color: "#c62828",
                                                borderRadius: "50%",
                                                width: "28px",
                                                height: "28px",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                fontSize: "18px"
                                            }}
                                        >
                                            {dismissingTableId === table.tableId ? "…" : "×"}
                                        </button>
                                    </div>
                                </div>

                                <h2>
                                    {bill ? formatCurrency(bill.total) : "Bill unavailable"}
                                </h2>

                                <p style={{ color: "#777" }}>
                                    {bill
                                        ? `${bill.orders.length} order(s) · ${bill.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)`
                                        : "No active bill available"}
                                </p>

                                <button
                                    style={{
                                        ...styles.button,
                                        background: "#222",
                                        color: "#fff",
                                        width: "100%"
                                    }}
                                    disabled={!bill || billLoading}
                                    onClick={() => openBill(table)}
                                >
                                    {billLoading ? "Loading..." : "View Bill"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BILL MODAL */}
            {selectedTable && selectedBill && (
                <div
                    className="billing-modal-overlay"
                    onClick={closeBill}
                >
                    <section
                        className="billing-modal"
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="billing-modal-title"
                    >
                        <button
                            className="billing-modal-close"
                            onClick={closeBill}
                            title="Close invoice"
                            aria-label="Close invoice"
                        >
                            ×
                        </button>

                        {/* INVOICE HEADER */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px"
                        }}>
                            <div>
                                <p style={{
                                    color: "#999",
                                    fontSize: "12px",
                                    textTransform: "uppercase",
                                    letterSpacing: "1.5px",
                                    marginBottom: "5px"
                                }}>
                                    DynFlw · Dining, in Sync.
                                </p>

                                <h2 id="billing-modal-title" style={{ margin: 0 }}>
                                    Invoice
                                </h2>
                            </div>

                            <div style={{ textAlign: "right" }}>
                                <h3>Table {selectedBill.table.tableNumber}</h3>
                                <p style={{ color: "#777", fontSize: "12px" }}>
                                    Session: {selectedBill.session.sessionId.slice(0, 8)}
                                </p>
                            </div>
                        </div>

                        <hr />

                        {/* RESTAURANT DETAILS */}
                        <h3>{restaurantName}</h3>
                        {restaurantTagline && <p>{restaurantTagline}</p>}
                        {restaurantAddress && <p>{restaurantAddress}</p>}
                        {restaurantPhone && <p>Contact: {restaurantPhone}</p>}
                        {restaurantEmail && <p>Email: {restaurantEmail}</p>}
                        {restaurantGSTIN && <p>GSTIN: {restaurantGSTIN}</p>}

                        {/* ORDERED ITEMS */}
                        <h3>Ordered Items</h3>

                        <div style={{ overflowX: "auto" }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.cell}>Dish</th>
                                        <th style={styles.cell}>Price</th>
                                        <th style={styles.cell}>Qty</th>
                                        <th style={styles.cell}>Total</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {selectedBill.items.map((item, index) => (
                                        <tr key={`${item.dishId}-${item.price}-${index}`}>
                                            <td style={styles.cell}>{item.name}</td>
                                            <td style={styles.cell}>{formatCurrency(item.price)}</td>
                                            <td style={styles.cell}>{item.quantity}</td>
                                            <td style={styles.cell}>{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* GST BREAKDOWN */}
                        <div style={{
                            maxWidth: "350px",
                            marginLeft: "auto",
                            marginTop: "20px"
                        }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 0"
                            }}>
                                <span>Subtotal</span>
                                <strong>{formatCurrency(subtotal)}</strong>
                            </div>

                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 0"
                            }}>
                                <span>CGST ({cgstRate}%)</span>
                                <span>{formatCurrency(cgstAmount)}</span>
                            </div>

                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 0"
                            }}>
                                <span>SGST ({sgstRate}%)</span>
                                <span>{formatCurrency(sgstAmount)}</span>
                            </div>

                            <hr />

                            <h2 style={{ textAlign: "right" }}>
                                Grand Total: {formatCurrency(grandTotal)}
                            </h2>
                        </div>

                        {/* ORDER STATUS */}
                        <h3>Order Status</h3>

                        {selectedBill.orders.map(order => (
                            <div
                                key={order.orderId}
                                style={{
                                    padding: "12px",
                                    background: "#f7f7f7",
                                    borderRadius: "8px",
                                    marginBottom: "10px"
                                }}
                            >
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                    flexWrap: "wrap",
                                    alignItems: "center"
                                }}>
                                    <strong>
                                        Order #{order.orderId.slice(0, 8)}
                                    </strong>

                                    <select
                                        value={order.status}
                                        disabled={updatingOrderId === order.orderId}
                                        onChange={e =>
                                            handleStatusChange(order.orderId, e.target.value)
                                        }
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #ccc",
                                            background: order.status === "served" ? "#e5f7e9" : "#fff",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            textTransform: "capitalize",
                                            color: "black"
                                        }}
                                    >
                                        <option value="received">Received</option>
                                        <option value="preparing">Preparing</option>
                                        <option value="ready">Ready</option>
                                        <option value="served">Served</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <p style={{
                                    margin: "6px 0 0",
                                    color: "#777",
                                    fontSize: "13px"
                                }}>
                                    {order.items.map(item =>
                                        `${item.name} × ${item.quantity}`
                                    ).join(", ")}
                                </p>
                            </div>
                        ))}

                        {/* INVOICE ACTIONS */}
                        <div style={{
                            display: "flex",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginTop: "25px",
                            paddingTop: "15px",
                            borderTop: "1px solid #eee"
                        }}>
                            <button
                                style={{
                                    ...styles.button,
                                    background: "#eee",
                                    color: "#222"
                                }}
                                onClick={closeBill}
                            >
                                Close Invoice
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    background: "#fff0f0",
                                    color: "#c62828",
                                    border: "1px solid #e0aaaa"
                                }}
                                disabled={endingSession || checkoutLoading}
                                onClick={handleEndSession}
                            >
                                {endingSession ? "Ending Session..." : "End Table Session"}
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    background: "#2563eb",
                                    color: "#fff"
                                }}
                                onClick={() => setShowReceipt(true)}
                            >
                                Preview Receipt
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    background: allOrdersServed ? "#198754" : "#999",
                                    color: "#fff",
                                    flex: 1
                                }}
                                disabled={!allOrdersServed || checkoutLoading}
                                onClick={handleCheckout}
                            >
                                {checkoutLoading
                                    ? "Processing..."
                                    : allOrdersServed
                                        ? "Complete Checkout"
                                        : "Waiting for Orders to be Served"}
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {/* RECEIPT PREVIEW */}
            {showReceipt && selectedBill && (
                <div
                    className="receipt-overlay"
                    onClick={() => setShowReceipt(false)}
                >
                    <div
                        className="receipt-popup"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            width: "100%",
                            maxWidth: "440px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            borderRadius: "12px",
                            padding: "20px"
                        }}
                    >
                        <div
                            className="receipt-actions"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "20px"
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Receipt Preview</h3>

                            <button
                                onClick={() => setShowReceipt(false)}
                                style={{
                                    border: "none",
                                    background: "#eee",
                                    borderRadius: "6px",
                                    padding: "8px 12px",
                                    cursor: "pointer"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div
                            id="dynflw-receipt"
                            style={{
                                width: "100%",
                                maxWidth: "300px",
                                margin: "0 auto",
                                padding: "15px 10px",
                                fontFamily: "monospace",
                                color: "#111",
                                background: "#fff",
                                fontSize: "12px",
                                boxSizing: "border-box"
                            }}
                        >
                            {/* RESTAURANT DETAILS */}
                            <div style={{ textAlign: "center" }}>
                                {restaurant.logo && (
                                    <img
                                        src={restaurant.logo}
                                        alt={restaurantName}
                                        style={{
                                            maxWidth: "100px",
                                            maxHeight: "65px",
                                            objectFit: "contain",
                                            marginBottom: "8px"
                                        }}
                                    />
                                )}

                                <h2 style={{
                                    fontSize: "20px",
                                    margin: "0 0 5px"
                                }}>
                                    {restaurantName}
                                </h2>

                                {restaurantTagline && (
                                    <p style={{ margin: "3px 0" }}>{restaurantTagline}</p>
                                )}

                                {restaurantAddress && (
                                    <p style={{ margin: "3px 0" }}>{restaurantAddress}</p>
                                )}

                                {restaurantPhone && (
                                    <p style={{ margin: "3px 0" }}>Contact: {restaurantPhone}</p>
                                )}

                                {restaurantEmail && (
                                    <p style={{ margin: "3px 0" }}>{restaurantEmail}</p>
                                )}

                                {restaurantGSTIN && (
                                    <p style={{ margin: "3px 0" }}>GSTIN: {restaurantGSTIN}</p>
                                )}
                            </div>

                            <div style={{
                                borderTop: "1px dashed #333",
                                borderBottom: "1px dashed #333",
                                margin: "12px 0",
                                padding: "8px 0"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Table</span>
                                    <strong>{selectedBill.table.tableNumber}</strong>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Session</span>
                                    <span>{selectedBill.session.sessionId.slice(0, 8)}</span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Date</span>
                                    <span>{new Date().toLocaleDateString("en-IN")}</span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Time</span>
                                    <span>{new Date().toLocaleTimeString("en-IN")}</span>
                                </div>
                            </div>

                            {/* ITEMS */}
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 35px 65px",
                                fontWeight: "bold",
                                marginBottom: "8px"
                            }}>
                                <span>Item</span>
                                <span style={{ textAlign: "center" }}>Qty</span>
                                <span style={{ textAlign: "right" }}>Amount</span>
                            </div>

                            {selectedBill.items.map((item, index) => (
                                <div
                                    key={`${item.dishId}-${item.price}-${index}`}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 35px 65px",
                                        marginBottom: "8px",
                                        alignItems: "start",
                                        gap: "3px"
                                    }}
                                >
                                    <span style={{ overflowWrap: "anywhere" }}>{item.name}</span>
                                    <span style={{ textAlign: "center" }}>{item.quantity}</span>
                                    <span style={{ textAlign: "right" }}>{formatCurrency(item.total)}</span>
                                </div>
                            ))}

                            {/* RECEIPT GST */}
                            <div style={{
                                borderTop: "1px dashed #333",
                                marginTop: "12px",
                                paddingTop: "10px"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "6px"
                                }}>
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "6px"
                                }}>
                                    <span>CGST ({cgstRate}%)</span>
                                    <span>{formatCurrency(cgstAmount)}</span>
                                </div>

                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "6px"
                                }}>
                                    <span>SGST ({sgstRate}%)</span>
                                    <span>{formatCurrency(sgstAmount)}</span>
                                </div>

                                <div style={{
                                    borderTop: "1px dashed #333",
                                    marginTop: "8px",
                                    paddingTop: "8px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontWeight: "bold",
                                    fontSize: "15px",
                                    gap: "8px"
                                }}>
                                    <span>GRAND TOTAL</span>
                                    <span>{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div style={{
                                textAlign: "center",
                                borderTop: "1px dashed #333",
                                marginTop: "15px",
                                paddingTop: "12px"
                            }}>
                                <p>{invoiceFooter}</p>
                                <strong>Powered by DynFlw</strong>
                                <p style={{ fontSize: "10px" }}>Dining, in Sync.</p>
                            </div>
                        </div>

                        <div
                            className="receipt-actions"
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "20px"
                            }}
                        >
                            <button
                                onClick={() => window.print()}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    background: "#222",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                Print Receipt
                            </button>

                            <button
                                onClick={() => setShowReceipt(false)}
                                style={{
                                    padding: "12px",
                                    background: "#eee",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <p style={{
                textAlign: "center",
                color: "#aaa",
                fontSize: "12px",
                marginTop: "40px"
            }}>
                Powered by DynFlw
            </p>
        </div>
    );
}

export default ManagerBilling;
