
import { useState, useEffect } from "react";
import API_BASE_URL from "../config/api";
import { io } from "socket.io-client";

function ManagerKitchen() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const currentStatuses = ["received", "preparing", "ready"];

    async function fetchOrders() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch orders.");
            }

            const fetchedOrders = Array.isArray(data)
                ? data
                : Array.isArray(data.orders)
                    ? data.orders
                    : [];

            setOrders(
                fetchedOrders.filter(order =>
                    currentStatuses.includes(order.status)
                )
            );

            setError("");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const socket = io(API_BASE_URL);

        socket.on("new-order", (newOrder) => {
            if (!currentStatuses.includes(newOrder.status)) return;

            setOrders(previous => {
                const exists = previous.some(
                    order => order.orderId === newOrder.orderId
                );

                if (exists) {
                    return previous.map(order =>
                        order.orderId === newOrder.orderId
                            ? newOrder
                            : order
                    );
                }

                return [newOrder, ...previous];
            });
        });

        socket.on("order-status-updated", (updatedOrder) => {
            setOrders(previous => {
                if (!currentStatuses.includes(updatedOrder.status)) {
                    return previous.filter(
                        order => order.orderId !== updatedOrder.orderId
                    );
                }

                const exists = previous.some(
                    order => order.orderId === updatedOrder.orderId
                );

                if (exists) {
                    return previous.map(order =>
                        order.orderId === updatedOrder.orderId
                            ? updatedOrder
                            : order
                    );
                }

                return [updatedOrder, ...previous];
            });
        });

        fetchOrders();

        return () => socket.disconnect();
    }, []);

    const statusStyles = {
        received: {
            background: "#f8d7da",
            color: "#842029",
            label: "NEW ORDER"
        },
        preparing: {
            background: "#cfe2ff",
            color: "#084298",
            label: "PREPARING"
        },
        ready: {
            background: "#d1e7dd",
            color: "#0f5132",
            label: "READY"
        }
    };

    if (loading) {
        return <h2 style={{ textAlign: "center" }}>Loading kitchen overview...</h2>;
    }

    if (error) {
        return (
            <div style={{ textAlign: "center", padding: "30px" }}>
                <h2>{error}</h2>
                <button onClick={fetchOrders}>Try Again</button>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: "1400px",
            margin: "30px auto",
            padding: "25px",
            fontFamily: "Arial, sans-serif"
        }}>
            <div style={{ marginBottom: "25px" }}>
                <h1 style={{ margin: 0, fontSize: "30px" }}>
                    Kitchen Overview
                </h1>
                <p style={{ color: "#666", marginTop: "8px" }}>
                    Monitor current kitchen orders and their statuses.
                </p>
            </div>

            {orders.length === 0 ? (
                <div style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "#f5f5f5",
                    borderRadius: "12px"
                }}>
                    <h2 style={{color:"black"}}>No active kitchen orders.</h2>
                    <p style={{ color: "#777" }}>
                        New orders will appear here automatically.
                    </p>
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "20px"
                }}>
                    {orders.map(order => {
                        const status = statusStyles[order.status];

                        return (
                            <div key={order.orderId} style={{
                                background: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "12px",
                                padding: "20px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                color: "black"
                            }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "10px"
                                }}>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: "18px",
                                        overflowWrap: "anywhere"
                                    }}>
                                        Order #{order.orderId}
                                    </h2>

                                    <span style={{
                                        background: status.background,
                                        color: status.color,
                                        padding: "6px 10px",
                                        borderRadius: "20px",
                                        fontSize: "11px",
                                        fontWeight: "bold",
                                        whiteSpace: "nowrap"
                                    }}>
                                        {status.label}
                                    </span>
                                </div>

                                <div style={{
                                    marginTop: "18px",
                                    padding: "12px",
                                    background: "#f5f5f5",
                                    borderRadius: "8px",
                                    display: "flex",
                                    justifyContent: "space-between"
                                }}>
                                    <strong>TABLE NUMBER</strong>
                                    <strong style={{ fontSize: "20px" }}>
                                        {order.tableNumber ?? "N/A"}
                                    </strong>
                                </div>

                                <p style={{ color: "#666", fontSize: "13px" }}>
                                    Placed at: {new Date(order.createdAt).toLocaleString()}
                                </p>

                                <hr style={{ border: 0, borderTop: "1px solid #ddd" }} />

                                <h3 style={{ fontSize: "16px" }}>Items</h3>

                                {order.items.map((item, index) => (
                                    <div key={index} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "10px",
                                        gap: "10px"
                                    }}>
                                        <span>{item.name}</span>
                                        <strong>× {item.quantity}</strong>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ManagerKitchen;
