
import { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../config/api";
import { io } from "socket.io-client";

const SERVED_DISPLAY_TIME = 30000;

function KitchenPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(false);

    const audioRef = useRef(null);
    const soundEnabledRef = useRef(false);
    const knownOrderIdsRef = useRef(new Set());
    const servedTimersRef = useRef(new Map());

    const [dismissedOrders, setDismissedOrders] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("dynflw-dismissed-orders") || "[]"
            );
        } catch {
            return [];
        }
    });

    const dismissedOrdersRef = useRef(dismissedOrders);

    // REMOVE ORDER FROM DISPLAY
    function removeOrder(orderId) {
        setOrders(previousOrders =>
            previousOrders.filter(order => order.orderId !== orderId)
        );
    }

    // CLEAR EXISTING SERVED TIMER
    function clearServedTimer(orderId) {
        const timer = servedTimersRef.current.get(orderId);

        if (timer) {
            clearTimeout(timer);
            servedTimersRef.current.delete(orderId);
        }
    }

    // SCHEDULE ORDER REMOVAL 30 SECONDS AFTER IT IS SERVED
    function scheduleServedRemoval(order) {
        if (!order?.orderId || order.status !== "served") return;

        // Prevent multiple timers for the same order.
        clearServedTimer(order.orderId);

        const servedAt = order.servedAt || order.updatedAt;

        const servedTimestamp = servedAt
            ? new Date(servedAt).getTime()
            : Date.now();

        const elapsed = Date.now() - servedTimestamp;

        const remainingTime = Math.max(
            0,
            SERVED_DISPLAY_TIME - elapsed
        );

        // If 30 seconds have already passed, remove immediately.
        if (remainingTime === 0) {
            removeOrder(order.orderId);
            return;
        }

        const timer = setTimeout(() => {
            removeOrder(order.orderId);
            servedTimersRef.current.delete(order.orderId);
        }, remainingTime);

        servedTimersRef.current.set(order.orderId, timer);
    }

    // AUDIO SETUP
    useEffect(() => {
        audioRef.current = new Audio("/sounds/new-order.mp3");
        audioRef.current.preload = "auto";

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // ENABLE NOTIFICATION SOUND
    async function enableSound() {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio("/sounds/new-order.mp3");
            }

            audioRef.current.currentTime = 0;
            await audioRef.current.play();

            soundEnabledRef.current = true;
            setSoundEnabled(true);
        } catch (error) {
            console.error("Could not play notification sound:", error);

            alert(
                "Could not play the sound. Please check the audio file."
            );
        }
    }

    // MUTE NOTIFICATION SOUND
    function muteSound() {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
    }

    // PLAY NOTIFICATION SOUND
    function playNotificationSound() {
        if (!soundEnabledRef.current || !audioRef.current) return;

        audioRef.current.currentTime = 0;

        audioRef.current.play().catch(error => {
            console.error("Notification playback failed:", error);
        });
    }

    // FETCH ORDERS
    async function fetchOrders() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to fetch orders."
                );
            }

            const fetchedOrders = Array.isArray(data)
                ? data
                : Array.isArray(data.orders)
                    ? data.orders
                    : [];

            // Register fetched orders and schedule recently served orders.
            fetchedOrders.forEach(order => {
                knownOrderIdsRef.current.add(order.orderId);

                if (order.status === "served") {
                    scheduleServedRemoval(order);
                } else {
                    clearServedTimer(order.orderId);
                }
            });

            setOrders(
                fetchedOrders.filter(
                    order =>
                        !dismissedOrdersRef.current.includes(order.orderId)
                )
            );

            setError("");
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    // DISMISS ORDER
    function dismissOrder(orderId) {
        clearServedTimer(orderId);

        const updatedDismissedOrders = [
            ...dismissedOrdersRef.current,
            orderId
        ];

        dismissedOrdersRef.current = updatedDismissedOrders;
        setDismissedOrders(updatedDismissedOrders);

        localStorage.setItem(
            "dynflw-dismissed-orders",
            JSON.stringify(updatedDismissedOrders)
        );

        removeOrder(orderId);
    }

    // SOCKET.IO
    useEffect(() => {
        const socket = io(API_BASE_URL);

        // LISTEN FOR NEW ORDERS
        socket.on("new-order", newOrder => {
            if (
                dismissedOrdersRef.current.includes(newOrder.orderId) ||
                knownOrderIdsRef.current.has(newOrder.orderId)
            ) {
                return;
            }

            knownOrderIdsRef.current.add(newOrder.orderId);

            setOrders(previousOrders => [
                newOrder,
                ...previousOrders
            ]);

            if (newOrder.status === "served") {
                scheduleServedRemoval(newOrder);
            }

            playNotificationSound();
        });

        // LISTEN FOR ORDER STATUS UPDATES
        socket.on("order-status-updated", updatedOrder => {
            if (
                dismissedOrdersRef.current.includes(updatedOrder.orderId)
            ) {
                return;
            }

            setOrders(previousOrders => {
                const orderExists = previousOrders.some(
                    order => order.orderId === updatedOrder.orderId
                );

                if (!orderExists && updatedOrder.status !== "served") {
                    return [updatedOrder, ...previousOrders];
                }

                if (!orderExists && updatedOrder.status === "served") {
                    return previousOrders;
                }

                return previousOrders.map(order =>
                    order.orderId === updatedOrder.orderId
                        ? updatedOrder
                        : order
                );
            });

            if (updatedOrder.status === "served") {
                scheduleServedRemoval(updatedOrder);
            } else {
                clearServedTimer(updatedOrder.orderId);
            }
        });

        // LOAD EXISTING ORDERS
        fetchOrders();

        // CLEANUP
        return () => {
            socket.disconnect();

            servedTimersRef.current.forEach(timer => {
                clearTimeout(timer);
            });

            servedTimersRef.current.clear();
        };
    }, []);

    // UPDATE ORDER STATUS
    async function updateOrderStatus(orderId, status) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/orders/${orderId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ status })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to update status."
                );
            }

            if (dismissedOrdersRef.current.includes(orderId)) return;

            const updatedOrder = data.order;

            setOrders(previousOrders =>
                previousOrders.map(order =>
                    order.orderId === orderId
                        ? updatedOrder
                        : order
                )
            );

            // Start the timer immediately after a successful update.
            if (updatedOrder.status === "served") {
                scheduleServedRemoval(updatedOrder);
            } else {
                clearServedTimer(orderId);
            }
        } catch (error) {
            alert(error.message);
        }
    }

    // STATUS CONFIGURATION
    const statusStyles = {
        received: {
            label: "NEW ORDER",
            color: "#A33A32",
            background: "#FCE9E5",
            border: "#E8B9AF"
        },
        preparing: {
            label: "PREPARING",
            color: "#80551E",
            background: "#FFF2D9",
            border: "#E8D09D"
        },
        ready: {
            label: "READY",
            color: "#356B4C",
            background: "#E5F2E8",
            border: "#B8D7BF"
        },
        served: {
            label: "SERVED",
            color: "#65615D",
            background: "#ECEAE7",
            border: "#D5D0CA"
        }
    };

    // LOADING SCREEN
    if (loading) {
        return (
            <div className="kitchen-loading">
                <div className="kitchen-loader" />
                <h2>Preparing your kitchen dashboard...</h2>
            </div>
        );
    }

    // ERROR SCREEN
    if (error) {
        return (
            <div className="kitchen-error">
                <h2>Unable to load orders</h2>
                <p>{error}</p>
                <button onClick={fetchOrders}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="kitchen-page">
            <style>{`
                .kitchen-page {
                    min-height: 100vh;
                    padding: 32px;
                    background: #F8F4EE;
                    color: #33251F;
                    font-family: Arial, sans-serif;
                    box-sizing: border-box;
                }

                .kitchen-page * { box-sizing: border-box; }

                .kitchen-header {
                    max-width: 1500px;
                    margin: 0 auto 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }

                .kitchen-brand {
                    font-size: 13px;
                    letter-spacing: 3px;
                    font-weight: 800;
                    color: #A65C43;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }

                .kitchen-header h1 {
                    font-size: 34px;
                    margin: 0;
                    letter-spacing: -1px;
                }

                .kitchen-header p {
                    color: #887A70;
                    margin: 8px 0 0;
                    font-size: 15px;
                }

                .kitchen-header-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .kitchen-header-btn {
                    border: 1px solid #E5D8CB;
                    border-radius: 10px;
                    padding: 13px 18px;
                    background: #fff;
                    color: #49362D;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                }

                .kitchen-header-btn.sound-on {
                    background: #E6F1E8;
                    border-color: #B8D7BF;
                    color: #356B4C;
                }

                .kitchen-header-btn:hover {
                    transform: translateY(-1px);
                }

                .kitchen-summary {
                    max-width: 1500px;
                    margin: 0 auto 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .kitchen-summary-title {
                    font-size: 20px;
                    font-weight: 800;
                }

                .kitchen-count {
                    background: #EFE4D9;
                    color: #79513E;
                    padding: 8px 14px;
                    border-radius: 30px;
                    font-weight: 800;
                    font-size: 13px;
                }

                .kitchen-grid {
                    max-width: 1500px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 22px;
                    align-items: start;
                }

                .kitchen-order-card {
                    background: #FFFFFF;
                    border: 1px solid #E9DED3;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 5px 18px rgba(65, 43, 30, 0.06);
                    min-width: 0;
                }

                .kitchen-card-top {
                    padding: 17px 20px;
                    background: #F2E7DC;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }

                .kitchen-order-reference { min-width: 0; }

                .kitchen-order-label {
                    color: #8B7669;
                    font-size: 10px;
                    letter-spacing: 1.5px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .kitchen-order-id {
                    font-size: 13px;
                    font-weight: 700;
                    color: #49362D;
                    margin-top: 5px;
                    overflow-wrap: anywhere;
                }

                .kitchen-status {
                    flex-shrink: 0;
                    padding: 9px 12px;
                    border-radius: 30px;
                    font-size: 11px;
                    letter-spacing: 0.7px;
                    font-weight: 900;
                }

                .kitchen-card-body { padding: 20px; }

                .kitchen-table-box {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 17px;
                    background: #FAF7F3;
                    border: 1px solid #EDE3D9;
                    border-radius: 11px;
                    margin-bottom: 22px;
                }

                .kitchen-table-label {
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    color: #887A70;
                }

                .kitchen-table-number {
                    font-size: 30px;
                    font-weight: 900;
                    color: #38271F;
                }

                .kitchen-time {
                    font-size: 12px;
                    color: #92847A;
                    margin: -10px 0 20px;
                }

                .kitchen-section-label {
                    color: #9A8171;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 1.8px;
                    font-weight: 900;
                    margin-bottom: 12px;
                }

                .kitchen-items {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .kitchen-item {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 12px;
                    align-items: center;
                    padding: 15px 14px;
                    background: #FFFCF8;
                    border: 1px solid #EDE4DA;
                    border-left: 5px solid #B96F50;
                    border-radius: 10px;
                }

                .kitchen-item-name {
                    color: #30221B;
                    font-size: 27px;
                    font-weight: 900;
                    line-height: 1.2;
                    overflow-wrap: anywhere;
                    letter-spacing: -0.6px;
                }

                .kitchen-item-quantity {
                    min-width: 62px;
                    min-height: 54px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: 10px;
                    background: #4A3429;
                    color: #FFFFFF;
                    font-size: 23px;
                    font-weight: 900;
                    padding: 8px;
                    white-space: nowrap;
                }

                .kitchen-instructions {
                    margin-top: 20px;
                    padding: 16px;
                    border-radius: 11px;
                    background: #FFF4DF;
                    border: 1px solid #EED8A9;
                }

                .kitchen-instructions.has-instructions {
                    background: #FFF0E8;
                    border-color: #E8BCA7;
                }

                .kitchen-instructions-title {
                    color: #765239;
                    font-size: 12px;
                    letter-spacing: 1px;
                    font-weight: 900;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }

                .kitchen-instructions-text {
                    color: #49362D;
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                    margin: 0;
                }

                .kitchen-card-footer {
                    padding: 17px 20px 20px;
                    border-top: 1px solid #EFE7DF;
                }

                .kitchen-total {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    color: #887A70;
                    font-size: 13px;
                    font-weight: 700;
                }

                .kitchen-total strong {
                    color: #38271F;
                    font-size: 22px;
                }

                .kitchen-action {
                    width: 100%;
                    min-height: 52px;
                    padding: 13px 16px;
                    border: none;
                    border-radius: 10px;
                    color: white;
                    font-size: 16px;
                    font-weight: 900;
                    cursor: pointer;
                    transition: transform 0.15s, opacity 0.15s;
                }

                .kitchen-action:hover {
                    transform: translateY(-2px);
                    opacity: 0.93;
                }

                .kitchen-action:active { transform: translateY(0); }
                .kitchen-action.prepare { background: #A65C43; }
                .kitchen-action.ready { background: #547B59; }
                .kitchen-action.served { background: #66564B; }

                .kitchen-dismiss {
                    border: none;
                    background: transparent;
                    color: #8C786C;
                    cursor: pointer;
                    font-size: 22px;
                    line-height: 1;
                    padding: 3px 5px;
                }

                .kitchen-dismiss:hover { color: #A33A32; }

                .kitchen-empty {
                    max-width: 1500px;
                    margin: 0 auto;
                    text-align: center;
                    padding: 75px 20px;
                    background: #FFFFFF;
                    border: 1px solid #E9DED3;
                    border-radius: 16px;
                }

                .kitchen-empty-icon {
                    font-size: 42px;
                    margin-bottom: 12px;
                }

                .kitchen-empty h2 {
                    color: #49362D;
                    margin: 0 0 10px;
                }

                .kitchen-empty p { color: #92847A; }

                .kitchen-loading,
                .kitchen-error {
                    min-height: 70vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    gap: 15px;
                    color: #49362D;
                    font-family: Arial, sans-serif;
                }

                .kitchen-loader {
                    width: 38px;
                    height: 38px;
                    border: 4px solid #E9DED3;
                    border-top-color: #A65C43;
                    border-radius: 50%;
                    animation: kitchenSpin 0.8s linear infinite;
                }

                @keyframes kitchenSpin {
                    to { transform: rotate(360deg); }
                }

                .kitchen-error button {
                    padding: 12px 22px;
                    border: none;
                    border-radius: 9px;
                    background: #A65C43;
                    color: white;
                    font-weight: 800;
                    cursor: pointer;
                }

                .kitchen-footer {
                    max-width: 1500px;
                    margin: 35px auto 0;
                    text-align: center;
                    color: #B3A59A;
                    font-size: 11px;
                    letter-spacing: 1px;
                }

                @media (max-width: 700px) {
                    .kitchen-page { padding: 18px 12px; }
                    .kitchen-header h1 { font-size: 27px; }

                    .kitchen-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .kitchen-item-name { font-size: 25px; }

                    .kitchen-header-actions { width: 100%; }
                    .kitchen-header-btn { flex: 1; }
                }
            `}</style>

            {/* HEADER */}
            <header className="kitchen-header">
                {/* <div>
                    <div className="kitchen-brand">
                        DYNFLW · DINING, IN SYNC.
                    </div>

                    <h1>Kitchen Dashboard</h1>

                    <p>Live orders · Keep every dish moving.</p>
                </div> */}

                <div className="kitchen-header-actions">
                    <button
                        className={`kitchen-header-btn ${soundEnabled ? "sound-on" : ""}`}
                        onClick={soundEnabled ? muteSound : enableSound}
                    >
                        {soundEnabled
                            ? "🔔 Sound Enabled"
                            : "🔕 Enable Sound"}
                    </button>

                    <button
                        className="kitchen-header-btn"
                        onClick={fetchOrders}
                    >
                        ↻ Refresh Orders
                    </button>
                </div>
            </header>

            {/* ORDER SUMMARY */}
            <div className="kitchen-summary">
                <div className="kitchen-summary-title">
                    Incoming Orders
                </div>

                <div className="kitchen-count">
                    {orders.length} ACTIVE{" "}
                    {orders.length === 1 ? "ORDER" : "ORDERS"}
                </div>
            </div>

            {/* ORDERS */}
            {orders.length === 0 ? (
                <div className="kitchen-empty">
                    <div className="kitchen-empty-icon">🍽️</div>

                    <h2>All caught up!</h2>

                    <p>
                        New customer orders will appear here automatically.
                    </p>
                </div>
            ) : (
                <div className="kitchen-grid">
                    {orders.map(order => {
                        const status =
                            statusStyles[order.status] ||
                            statusStyles.received;

                        const hasInstructions =
                            Boolean(order.specialInstructions?.trim());

                        return (
                            <article
                                key={order.orderId}
                                className="kitchen-order-card"
                            >
                                {/* CARD HEADER */}
                                <div className="kitchen-card-top">
                                    <div className="kitchen-order-reference">
                                        <div className="kitchen-order-label">
                                            Order reference
                                        </div>

                                        <div className="kitchen-order-id">
                                            #{order.orderId}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <span
                                            className="kitchen-status"
                                            style={{
                                                color: status.color,
                                                background: status.background,
                                                border: `1px solid ${status.border}`
                                            }}
                                        >
                                            {status.label}
                                        </span>

                                        <button
                                            className="kitchen-dismiss"
                                            onClick={() =>
                                                dismissOrder(order.orderId)
                                            }
                                            title="Dismiss order"
                                            aria-label="Dismiss order"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div className="kitchen-card-body">
                                    {/* TABLE */}
                                    <div className="kitchen-table-box">
                                        <span className="kitchen-table-label">
                                            TABLE NUMBER
                                        </span>

                                        <span className="kitchen-table-number">
                                            {order.tableNumber ?? "N/A"}
                                        </span>
                                    </div>

                                    <p className="kitchen-time">
                                        Placed at:{" "}
                                        {new Date(
                                            order.createdAt
                                        ).toLocaleString()}
                                    </p>

                                    {/* ITEMS */}
                                    <div className="kitchen-section-label">
                                        Order items
                                    </div>

                                    <div className="kitchen-items">
                                        {order.items.map((item, index) => (
                                            <div
                                                className="kitchen-item"
                                                key={index}
                                            >
                                                <div className="kitchen-item-name">
                                                    {item.name}
                                                </div>

                                                <div className="kitchen-item-quantity">
                                                    × {item.quantity}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* SPECIAL INSTRUCTIONS */}
                                    <div
                                        className={`kitchen-instructions ${
                                            hasInstructions
                                                ? "has-instructions"
                                                : ""
                                        }`}
                                    >
                                        <div className="kitchen-instructions-title">
                                            {hasInstructions
                                                ? "⚠ Special Instructions"
                                                : "Special Instructions"}
                                        </div>

                                        <p className="kitchen-instructions-text">
                                            {order.specialInstructions?.trim() ||
                                                "No special instructions."}
                                        </p>
                                    </div>
                                </div>

                                {/* CARD FOOTER */}
                                <div className="kitchen-card-footer">
                                    <div className="kitchen-total">
                                        <span>ORDER TOTAL</span>

                                        <strong>
                                            ₹
                                            {Number(
                                                order.total || 0
                                            ).toFixed(2)}
                                        </strong>
                                    </div>

                                    {order.status === "received" && (
                                        <button
                                            className="kitchen-action prepare"
                                            onClick={() =>
                                                updateOrderStatus(
                                                    order.orderId,
                                                    "preparing"
                                                )
                                            }
                                        >
                                            Start Preparing →
                                        </button>
                                    )}

                                    {order.status === "preparing" && (
                                        <button
                                            className="kitchen-action ready"
                                            onClick={() =>
                                                updateOrderStatus(
                                                    order.orderId,
                                                    "ready"
                                                )
                                            }
                                        >
                                            Mark as Ready →
                                        </button>
                                    )}

                                    {order.status === "ready" && (
                                        <button
                                            className="kitchen-action served"
                                            onClick={() =>
                                                updateOrderStatus(
                                                    order.orderId,
                                                    "served"
                                                )
                                            }
                                        >
                                            Mark as Served →
                                        </button>
                                    )}

                                    {order.status === "served" && (
                                        <div
                                            style={{
                                                textAlign: "center",
                                                color: "#547B59",
                                                fontWeight: 900,
                                                padding: "12px"
                                            }}
                                        >
                                            ✓ ORDER COMPLETED
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <footer className="kitchen-footer">
                POWERED BY DYNFLW · DINING, IN SYNC.
            </footer>
        </div>
    );
}

export default KitchenPage;
