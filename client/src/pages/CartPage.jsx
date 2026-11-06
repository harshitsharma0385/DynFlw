import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import API_BASE_URL from "../config/api";

const pageStyles = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');

body {
    margin: 0;
    background: #13241e;
}

.cart-page {
    --bottle: #13241e;
    --moss: #1a2f27;
    --ivory: #efe9dc;
    --mist: #a3b0a6;
    --champagne: #c9aa6c;
    --claret: #e3a3a3;
    --line: rgba(201, 170, 108, 0.28);

    min-height: 100vh;
    box-sizing: border-box;
    padding: 56px 16px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: var(--bottle);
    color: var(--ivory);
    font-family: 'Jost', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 300;
    line-height: 1.6;
}

.cart-page *,
.cart-page *::before,
.cart-page *::after {
    box-sizing: border-box;
}

.cart-panel {
    width: 100%;
    max-width: 640px;
    padding: 48px 44px;
    background: var(--moss);
    border: 1px solid var(--line);
    border-radius: 2px;
    animation: cart-settle 600ms ease-out both;
}

.cart-panel--empty {
    max-width: 520px;
    text-align: center;
    padding: 64px 44px;
}

@keyframes cart-settle {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
}

.cart-heading {
    margin: 0 0 8px;
    padding-bottom: 22px;
    border-bottom: 1px solid var(--line);
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 500;
    font-size: 2.6rem;
    line-height: 1.1;
    letter-spacing: 0.01em;
    font-size: 50px;
}

.cart-panel--empty .cart-heading {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 16px;
}

.cart-item {
    padding: 24px 0;
    border-bottom: 1px solid var(--line);
}

.cart-item-top {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}

.cart-item-name {
    margin: 0;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 500;
    font-size: 1.6rem;
    line-height: 1.2;
}

.cart-leader {
    flex: 1;
    min-width: 16px;
    margin-bottom: 0.4em;
    border-bottom: 1px dotted rgba(201, 170, 108, 0.55);
}

.cart-item-subtotal {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 500;
    font-size: 1.6rem;
    line-height: 1.2;
    color: var(--champagne);
    white-space: nowrap;
}

.cart-item-price {
    margin: 4px 0 16px;
    color: var(--mist);
    font-size: 0.95rem;
}

.cart-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.cart-stepper {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 2px;
}

.cart-stepper button {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--ivory);
    font-family: inherit;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.cart-stepper button:hover:not(:disabled) {
    background: rgba(201, 170, 108, 0.16);
}

.cart-quantity {
    min-width: 2.4ch;
    text-align: center;
    font-weight: 400;
}

.cart-remove {
    margin-left: auto;
    padding: 4px 0;
    border: none;
    background: transparent;
    color: var(--mist);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 300;
    cursor: pointer;
    text-underline-offset: 4px;
    transition: color 160ms ease;
}

.cart-remove:hover:not(:disabled) {
    color: var(--ivory);
    text-decoration: underline;
}

.cart-page button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.cart-total {
    margin: 28px 0 4px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 500;
    font-size: 1.9rem;
}

.cart-total-amount {
    font-size: 2.4rem;
    color: var(--champagne);
}

.cart-note {
    margin: 0 0 32px;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 1.1rem;
    color: var(--mist);
}

.cart-order-button {
    width: 100%;
    padding: 16px 24px;
    border: 1px solid var(--champagne);
    border-radius: 2px;
    background: var(--champagne);
    color: var(--bottle);
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.cart-order-button:hover:not(:disabled) {
    background: #d8bd84;
}

.cart-message {
    margin: 20px 0 0;
    text-align: center;
}

.cart-message--ok {
    color: var(--champagne);
}

.cart-message--error {
    color: var(--claret);
}

.cart-order-id {
    margin: 8px 0 0;
    text-align: center;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.3rem;
    color: var(--ivory);
}

.cart-panel--empty p {
    margin: 0 0 8px;
    color: var(--mist);
}

.cart-panel--empty .cart-order-id {
    color: var(--ivory);
    margin: 4px 0 16px;
}

.cart-link {
    display: inline-block;
    margin-top: 28px;
    padding-bottom: 3px;
    border-bottom: 1px solid var(--champagne);
    color: var(--champagne);
    text-decoration: none;
    transition: color 160ms ease;
}

.cart-link:hover {
    color: var(--ivory);
}

.cart-page button:focus-visible,
.cart-page a:focus-visible {
    outline: 2px solid var(--champagne);
    outline-offset: 3px;
}

@media (max-width: 520px) {
    .cart-page {
        padding: 24px 12px;
    }

    .cart-panel,
    .cart-panel--empty {
        padding: 32px 20px;
    }

    .cart-heading {
        font-size: 2.1rem;
    }

    .cart-item-name,
    .cart-item-subtotal {
        font-size: 1.35rem;
    }

    .cart-total {
        font-size: 1.6rem;
    }

    .cart-total-amount {
        font-size: 2rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .cart-panel {
        animation: none;
    }

    .cart-page * {
        transition: none !important;
    }
}
`;

function CartPage() {
    const {
        cartItems,
        updateQuantity,
        removeFromCart,
        clearCart,
        total,
        tableSession,
        updateCookingInstructions,
    } = useCart();

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [orderId, setOrderId] = useState('');
    const navigate = useNavigate();
    
async function placeOrder() {
    try {
        setLoading(true);
        setMessage('');
        setOrderId('');

        if (!tableSession?.sessionId) {
            throw new Error(
                'Your table session is missing. Please scan your table QR code again.'
            );
        }

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tableSessionId: tableSession.sessionId,
                items: cartItems.map(item => ({
                    dishId: item.dishId,
                    quantity: item.quantity,
                    cookingInstructions: item.cookingInstructions || ''
                }))
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to place order.');
        }

        setOrderId(data.order.orderId);
        setMessage('Your order has been placed successfully!');
        clearCart();

    } catch (error) {
        setMessage(error.message || 'Something went wrong. Please try again.');
    } finally {
        setLoading(false);
    }
}


    if (cartItems.length === 0) {
        return (
            <div className="cart-page">
                <style>{pageStyles}</style>

                <div className="cart-panel cart-panel--empty">
                    {message ? (
                        <>
                            <h1 className="cart-heading">{message}</h1>
                            {orderId && <p className="cart-order-id">Order ID: {orderId}</p>}
                            <p>Your cart is now empty.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="cart-heading">Your cart is empty</h1>
                            <p>Scan a dish QR code to start ordering.</p>
                        </>
                    )}

                    <Link to="/" className="cart-link">Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <style>{pageStyles}</style>

            <div className="cart-panel">
                <h1 className="cart-heading">Your Cart</h1>
                <button
                    className="cart-link"
                    onClick={() => navigate('/', {
                        state: { openScanner: true }
                    })}
                >
            + Add More Items
            </button>
                {cartItems.map(item => (
                    <div
                        key={item.dishId}
                        className="cart-item"
                    >
                        <div className="cart-item-top">
                            <h3 className="cart-item-name">{item.name}</h3>
                            <span className="cart-leader" aria-hidden="true" />
                            <span
                                className="cart-item-subtotal"
                                aria-label={`Subtotal ₹${item.price * item.quantity}`}
                            >
                                ₹{item.price * item.quantity}
                            </span>
                        </div>

                        <p className="cart-item-price">Price: ₹{item.price}</p>

<div style={{ marginBottom: '18px' }}>
    <label
        htmlFor={`instructions-${item.dishId}`}
        style={{
            display: 'block',
            marginBottom: '7px',
            color: '#c9aa6c',
            fontSize: '0.9rem',
            fontWeight: 400
        }}
    >
        Cooking Instructions <span style={{ color: '#000000' }}>(Optional)</span>
    </label>

    <textarea
        id={`instructions-${item.dishId}`}
        value={item.cookingInstructions || ''}
        onChange={(e) =>
            updateCookingInstructions(item.dishId, e.target.value)
        }
        placeholder="E.g. Less spicy, no onions, extra crispy..."
        maxLength={250}
        rows={2}
        disabled={loading}
        style={{
            width: '100%',
            padding: '12px',
            border: '1px solid rgba(201, 170, 108, 0.35)',
            borderRadius: '3px',
            background: '#13241e',
            color: '#efe9dc',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            resize: 'vertical',
            outlineColor: '#c9aa6c'
        }}
    />

    <p style={{
        margin: '4px 0 0',
        color: '#a3b0a6',
        fontSize: '0.75rem',
        textAlign: 'right'
    }}>
        {(item.cookingInstructions || '').length}/250
    </p>
</div>

                        <div className="cart-controls">
                            <div className="cart-stepper">
                                <button
                                    onClick={() => {
                                        updateQuantity(item.dishId, item.quantity - 1);
                                    }}
                                    disabled={loading}
                                    aria-label={`Decrease quantity of ${item.name}`}
                                >
                                    −
                                </button>

                                <span className="cart-quantity">{item.quantity}</span>

                                <button
                                    onClick={() => {
                                        updateQuantity(item.dishId, item.quantity + 1);
                                    }}
                                    disabled={loading}
                                    aria-label={`Increase quantity of ${item.name}`}
                                >
                                    +
                                </button>
                            </div>

                            <button
                                className="cart-remove"
                                onClick={() => removeFromCart(item.dishId)}
                                disabled={loading}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))}

                <h2 className="cart-total">
                    <span>Total</span>
                    <span className="cart-total-amount">₹{total}</span>
                </h2>

                <p className="cart-note">Taxes and any additional charges are not included yet.</p>

                <button
                    className="cart-order-button"
                    onClick={placeOrder}
                    disabled={loading || cartItems.length === 0}
                >
                    {loading ? 'Placing Order...' : 'Place Order'}
                </button>

                {message && (
                    <p
                        className={`cart-message ${orderId ? 'cart-message--ok' : 'cart-message--error'}`}
                        role={orderId ? 'status' : 'alert'}
                    >
                        {message}
                    </p>
                )}

                {orderId && <p className="cart-order-id">Order ID: {orderId}</p>}
            </div>
        </div>
    );
}

export default CartPage;