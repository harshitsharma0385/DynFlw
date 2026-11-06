import { useState } from 'react';
import { useCart } from '../context/CartContext';
import DishScanner from '../components/DishScanner';
import ThemeToggle from '../components/Themetoggle.jsx';
import API_BASE_URL from '../config/api';

function HomePage() {
    const {
        table,
        tableSession,
        cartItems,
        updateQuantity,
        removeFromCart,
        clearCart,
        total
    } = useCart();

    const [placingOrder, setPlacingOrder] = useState(false);
    const [orderMessage, setOrderMessage] = useState('');
    const [orderId, setOrderId] = useState('');

    const [specialInstructions, setSpecialInstructions] = useState('');
    const [draftInstructions, setDraftInstructions] = useState('');
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);

    const itemCount = cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    function openInstructionsModal() {
        setDraftInstructions(specialInstructions);
        setShowInstructionsModal(true);
    }

    function saveInstructions() {
        setSpecialInstructions(draftInstructions.trim());
        setShowInstructionsModal(false);
    }

    async function handlePlaceOrder() {
        if (cartItems.length === 0) {
            setOrderMessage('Please add items to your cart first.');
            return;
        }

        if (!tableSession?.sessionId) {
            setOrderMessage(
                'Your table session could not be found. Please scan your table QR again.'
            );
            return;
        }

        try {
            setPlacingOrder(true);
            setOrderMessage('');
            setOrderId('');

            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tableSessionId: tableSession.sessionId,
                    specialInstructions: specialInstructions.trim(),
                    items: cartItems.map((item) => ({
                        dishId: item.dishId,
                        quantity: item.quantity
                    }))
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to place your order.'
                );
            }

            const placedOrderId =
                data.order?.orderId || data.orderId || '';

            clearCart();
            setSpecialInstructions('');
            setDraftInstructions('');
            setOrderId(placedOrderId);
            setOrderMessage('Your order has been placed successfully!');

        } catch (error) {
            setOrderMessage(
                error.message || 'Something went wrong. Please try again.'
            );
        } finally {
            setPlacingOrder(false);
        }
    }

    if (!table) {
        return (
            <div style={styles.noTable}>
                <h1>Welcome to DynFlw</h1>
                <p>Please scan the QR code on your table to get started.</p>
            </div>
        );
    }

    return (
        <div style={styles.page} className="dynflw-page">
            <style>
                {`
                    @keyframes dishAdded {
                        from {
                            opacity: 0;
                            transform: translateY(12px);
                            background: var(--accent-soft);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                            background: var(--surface);
                        }
                    }

                    @keyframes modalFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes modalSlideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px) scale(0.98);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }

                    .dynflw-logo span {
                        color: var(--accent-text);
                    }

                    .dynflw-cart-item {
                        animation: dishAdded 0.45s ease-out;
                    }

                    .dynflw-action-button {
                        transition:
                            transform 0.2s ease,
                            opacity 0.2s ease,
                            filter 0.16s ease,
                            background-color 0.16s ease,
                            border-color 0.16s ease;
                    }

                    .dynflw-action-button:active {
                        transform: scale(0.96);
                    }

                    .dynflw-primary:hover:not(:disabled) {
                        filter: brightness(1.08);
                    }

                    .dynflw-qty-button:hover:not(:disabled) {
                        background: var(--surface-2) !important;
                    }

                    .dynflw-ghost {
                        transition: border-color 0.16s ease;
                    }

                    .dynflw-ghost:hover:not(:disabled) {
                        border-color: var(--accent) !important;
                    }

                    .dynflw-page button:disabled {
                        cursor: not-allowed;
                    }

                    .dynflw-modal-overlay {
                        animation: modalFadeIn 0.2s ease-out;
                    }

                    .dynflw-modal-content {
                        animation: modalSlideUp 0.25s ease-out;
                    }

                    .dynflw-instructions-textarea::placeholder {
                        color: var(--muted);
                    }

                    .dynflw-instructions-textarea:focus {
                        border-color: var(--accent) !important;
                        outline: none;
                        box-shadow: 0 0 0 3px var(--accent-soft);
                    }

                    @media (max-width: 600px) {
                        .dynflw-page {
                            padding: 16px !important;
                        }

                        .dynflw-header {
                            flex-direction: column;
                            align-items: flex-start !important;
                            gap: 16px;
                        }

                        .dynflw-cart-item {
                            flex-direction: column;
                            align-items: stretch !important;
                        }

                        .dynflw-item-right {
                            flex-direction: row !important;
                            align-items: center !important;
                            justify-content: space-between !important;
                        }

                        .dynflw-modal-content {
                            padding: 22px !important;
                        }
                    }
                `}
            </style>

            {/* Header */}
            <header style={styles.header} className="dynflw-header">
                <div>
                    <h1 style={styles.logo} className="dynflw-logo">
                        DynFlw<span>.</span>
                    </h1>
                    <p style={styles.tagline}>Dining, in Sync.</p>
                </div>

                <div style={styles.headerActions}>
                    <ThemeToggle />

                    <div style={styles.tableBadge}>
                        <span style={styles.tableDot}></span>
                        Table {table.tableNumber}
                    </div>
                </div>
            </header>

            <div style={styles.content}>

                {/* Scanner Section */}
                <section style={styles.scannerSection}>
                    <div style={styles.sectionHeading}>
                        <div>
                            <p style={styles.eyebrow}>STEP 01</p>
                            <h2 style={styles.sectionTitle}>
                                Scan your dishes
                            </h2>
                            <p style={styles.description}>
                                Browse the physical menu and scan the QR code
                                beside any dish to add it to your order.
                            </p>
                        </div>

                        <div style={styles.scanIcon}>
                            QR
                        </div>
                    </div>

                    <DishScanner />
                </section>

                {/* Cart Section */}
                <section style={styles.cartSection}>
                    <div style={styles.cartHeading}>
                        <div>
                            <p style={styles.eyebrow}>STEP 02</p>
                            <h2 style={styles.sectionTitle}>
                                Your order
                            </h2>
                            <p style={styles.description}>
                                Review and customize your selected dishes.
                            </p>
                        </div>

                        <div style={styles.itemBadge}>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                    </div>

                    {cartItems.length === 0 ? (
                        <div style={styles.emptyCart}>
                            <div style={styles.emptyIcon}>
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="9" cy="20" r="1.5" />
                                    <circle cx="18" cy="20" r="1.5" />
                                    <path d="M3 4h2.2l2.1 11h10.4l2-8H6.2" />
                                </svg>
                            </div>

                            <h3 style={{ margin: '10px 0 6px' }}>
                                Your cart is empty
                            </h3>

                            <p style={styles.description}>
                                Scan a dish QR code above to get started.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Cart Items */}
                            <div style={styles.cartList}>
                                {cartItems.map((item) => (
                                    <div
                                        key={item.dishId}
                                        className="dynflw-cart-item"
                                        style={styles.cartItem}
                                    >
                                        <div style={styles.dishDetails}>
                                            <h3 style={styles.dishName}>
                                                {item.name}
                                            </h3>

                                            <p style={styles.dishPrice}>
                                                ₹{item.price} each
                                            </p>

                                            <button
                                                onClick={() =>
                                                    removeFromCart(item.dishId)
                                                }
                                                disabled={placingOrder}
                                                style={styles.removeButton}
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        {/* Quantity and Price */}
                                        <div
                                            style={styles.itemRight}
                                            className="dynflw-item-right"
                                        >
                                            <div style={styles.quantityControl}>
                                                <button
                                                    className="dynflw-action-button dynflw-qty-button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.dishId,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                    disabled={placingOrder}
                                                    style={styles.quantityButton}
                                                    aria-label={`Decrease ${item.name} quantity`}
                                                >
                                                    −
                                                </button>

                                                <span style={styles.quantity}>
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    className="dynflw-action-button dynflw-qty-button"
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.dishId,
                                                            item.quantity + 1
                                                        )
                                                    }
                                                    disabled={placingOrder}
                                                    style={styles.quantityButton}
                                                    aria-label={`Increase ${item.name} quantity`}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <strong style={styles.itemTotal}>
                                                ₹{item.price * item.quantity}
                                            </strong>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bill Summary */}
                            <div style={styles.billSummary}>
                                <div style={styles.billRow}>
                                    <span>Items ({itemCount})</span>
                                    <span>₹{total}</span>
                                </div>

                                <div style={styles.totalRow}>
                                    <strong>Total amount</strong>
                                    <strong style={styles.totalAmount}>
                                        ₹{total}
                                    </strong>
                                </div>

                                {/* Order-wide Special Instructions */}
                                <button
                                    type="button"
                                    className="dynflw-ghost"
                                    onClick={openInstructionsModal}
                                    disabled={placingOrder}
                                    style={styles.instructionsButton}
                                >
                                    <span style={styles.instructionsButtonIcon}>
                                        ✎
                                    </span>
                                    {specialInstructions
                                        ? 'Edit Special Instructions'
                                        : 'Add Special Instructions'}
                                    <span style={styles.optionalBadge}>
                                        Optional
                                    </span>
                                </button>

                                {specialInstructions && (
                                    <div style={styles.instructionsPreview}>
                                        <strong>Your instructions:</strong>
                                        <p>{specialInstructions}</p>
                                    </div>
                                )}

                                <button
                                    className="dynflw-action-button dynflw-primary"
                                    onClick={handlePlaceOrder}
                                    disabled={placingOrder}
                                    style={{
                                        ...styles.placeOrderButton,
                                        opacity: placingOrder ? 0.7 : 1
                                    }}
                                >
                                    {placingOrder
                                        ? 'Placing Order...'
                                        : 'Place Order →'}
                                </button>

                                <p style={styles.secureNote}>
                                    Your order will be sent directly to the kitchen.
                                </p>
                            </div>
                        </>
                    )}

                    {orderMessage && (
                        <div style={styles.orderMessage} role="status">
                            {orderMessage}

                            {orderId && (
                                <p style={{ marginBottom: 0 }}>
                                    Order ID: <strong>{orderId}</strong>
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Special Instructions Modal */}
            {showInstructionsModal && (
                <div
                    className="dynflw-modal-overlay"
                    style={styles.modalOverlay}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowInstructionsModal(false);
                        }
                    }}
                >
                    <div
                        className="dynflw-modal-content"
                        style={styles.modalContent}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="instructions-modal-title"
                    >
                        <div style={styles.modalHeader}>
                            <div>
                                <p style={styles.eyebrow}>YOUR ORDER</p>
                                <h2
                                    id="instructions-modal-title"
                                    style={styles.modalTitle}
                                >
                                    Special Instructions
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowInstructionsModal(false)}
                                style={styles.modalClose}
                                aria-label="Close instructions"
                            >
                                ×
                            </button>
                        </div>

                        <p style={styles.modalDescription}>
                            Let the kitchen know if you have any special
                            requests for your entire order.
                        </p>

                        <textarea
                            className="dynflw-instructions-textarea"
                            value={draftInstructions}
                            onChange={(e) =>
                                setDraftInstructions(e.target.value)
                            }
                            placeholder="E.g. Please make everything less spicy. Serve all dishes together..."
                            maxLength={500}
                            rows={5}
                            style={styles.modalTextarea}
                            autoFocus
                        />

                        <div style={styles.modalFooter}>
                            <span style={styles.characterCount}>
                                {draftInstructions.length}/500 characters
                            </span>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    className="dynflw-ghost"
                                    onClick={() => setShowInstructionsModal(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="dynflw-action-button dynflw-primary"
                                    onClick={saveInstructions}
                                    style={styles.saveButton}
                                >
                                    Save Instructions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <footer style={styles.footer}>
                DynFlw · Dining, in Sync.
            </footer>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '28px 20px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text)'
    },

    header: {
        maxWidth: '1050px',
        margin: '0 auto 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
    },

    logo: {
        fontSize: '30px',
        margin: 0,
        fontWeight: '800',
        letterSpacing: '-0.03em'
    },

    tagline: {
        margin: '4px 0 0',
        color: 'var(--muted)',
        fontSize: '13px'
    },

    tableBadge: {
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border-strong)',
        padding: '0 16px',
        height: '38px',
        borderRadius: '30px',
        fontWeight: '600',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },

    tableDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'var(--accent)'
    },

    content: {
        maxWidth: '1050px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
        gap: '24px',
        alignItems: 'start'
    },

    scannerSection: {
        background: 'var(--surface)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--border)'
    },

    cartSection: {
        background: 'var(--surface)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--border)'
    },

    sectionHeading: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
    },

    cartHeading: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
    },

    eyebrow: {
        color: 'var(--accent-text)',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '1.5px',
        margin: '0 0 7px'
    },

    sectionTitle: {
        fontSize: '23px',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        margin: 0
    },

    description: {
        color: 'var(--muted)',
        fontSize: '13px',
        lineHeight: 1.6,
        margin: '7px 0 0'
    },

    scanIcon: {
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: 'var(--accent-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: '13px',
        flexShrink: 0
    },

    itemBadge: {
        background: 'var(--surface-2)',
        color: 'var(--text-soft)',
        borderRadius: '20px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    },

    emptyCart: {
        padding: '45px 15px',
        background: 'var(--surface-2)',
        border: '1px dashed var(--border-strong)',
        borderRadius: '12px',
        textAlign: 'center'
    },

    emptyIcon: {
        color: 'var(--muted)',
        display: 'flex',
        justifyContent: 'center'
    },

    cartList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },

    cartItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '16px',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        background: 'var(--surface)'
    },

    dishDetails: {
        minWidth: 0,
        flex: 1
    },

    dishName: {
        fontSize: '16px',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        margin: 0,
        overflowWrap: 'anywhere'
    },

    dishPrice: {
        color: 'var(--muted)',
        fontSize: '12.5px',
        margin: '6px 0'
    },

    removeButton: {
        border: 'none',
        background: 'transparent',
        color: 'var(--danger)',
        fontSize: '12.5px',
        cursor: 'pointer',
        padding: 0
    },

    itemRight: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        flexShrink: 0
    },

    quantityControl: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },

    quantityButton: {
        width: '32px',
        height: '32px',
        border: '1px solid var(--border-strong)',
        background: 'transparent',
        color: 'var(--text)',
        borderRadius: '8px',
        fontSize: '18px',
        cursor: 'pointer'
    },

    quantity: {
        fontWeight: '700',
        fontSize: '14px',
        minWidth: '14px',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums'
    },

    itemTotal: {
        fontSize: '15px',
        fontVariantNumeric: 'tabular-nums'
    },

    billSummary: {
        marginTop: '22px',
        paddingTop: '18px',
        borderTop: '1px solid var(--border)'
    },

    billRow: {
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--text-soft)',
        fontSize: '13px',
        marginBottom: '14px',
        fontVariantNumeric: 'tabular-nums'
    },

    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontSize: '16px',
        marginBottom: '20px'
    },

    totalAmount: {
        fontSize: '26px',
        fontWeight: '800',
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums'
    },

    instructionsButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        marginBottom: '14px',
        border: '1px solid var(--border-strong)',
        borderRadius: '12px',
        background: 'transparent',
        color: 'var(--text)',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
    },

    instructionsButtonIcon: {
        fontSize: '17px',
        color: 'var(--accent-text)'
    },

    optionalBadge: {
        fontSize: '10px',
        fontWeight: '500',
        color: 'var(--muted)',
        background: 'var(--surface-2)',
        padding: '3px 7px',
        borderRadius: '20px'
    },

    instructionsPreview: {
        padding: '11px 13px',
        marginBottom: '16px',
        borderRadius: '10px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        fontSize: '12.5px',
        color: 'var(--text-soft)',
        overflowWrap: 'anywhere'
    },

    modalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '18px',
        boxSizing: 'border-box'
    },

    modalContent: {
        width: '100%',
        maxWidth: '480px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        boxSizing: 'border-box'
    },

    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px'
    },

    modalTitle: {
        margin: 0,
        fontSize: '22px',
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'var(--text)'
    },

    modalClose: {
        width: '32px',
        height: '32px',
        border: 'none',
        borderRadius: '8px',
        background: 'var(--surface-2)',
        color: 'var(--text-soft)',
        fontSize: '23px',
        lineHeight: 1,
        cursor: 'pointer'
    },

    modalDescription: {
        color: 'var(--muted)',
        fontSize: '13px',
        lineHeight: 1.6,
        margin: '14px 0 18px'
    },

    modalTextarea: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px',
        border: '1px solid var(--border-strong)',
        borderRadius: '12px',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'inherit',
        fontSize: '13.5px',
        lineHeight: 1.6,
        resize: 'vertical'
    },

    modalFooter: {
        marginTop: '12px'
    },

    characterCount: {
        display: 'block',
        textAlign: 'right',
        fontSize: '11px',
        color: 'var(--muted)',
        marginBottom: '16px'
    },

    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px'
    },

    cancelButton: {
        padding: '11px 16px',
        border: '1px solid var(--border-strong)',
        borderRadius: '10px',
        background: 'transparent',
        color: 'var(--text-soft)',
        fontWeight: '600',
        fontSize: '12.5px',
        cursor: 'pointer'
    },

    saveButton: {
        padding: '11px 17px',
        border: 'none',
        borderRadius: '10px',
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        fontWeight: '700',
        fontSize: '12.5px',
        cursor: 'pointer'
    },

    placeOrderButton: {
        width: '100%',
        padding: '16px',
        border: 'none',
        borderRadius: '12px',
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        fontWeight: '700',
        fontSize: '15px',
        cursor: 'pointer'
    },

    secureNote: {
        textAlign: 'center',
        fontSize: '11.5px',
        color: 'var(--muted)',
        margin: '12px 0 0'
    },

    orderMessage: {
        marginTop: '16px',
        padding: '13px 14px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        borderRadius: '12px',
        fontSize: '13px',
        overflowWrap: 'anywhere'
    },

    footer: {
        maxWidth: '1050px',
        margin: '35px auto 0',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '12px'
    },

    noTable: {
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text)',
        textAlign: 'center'
    }
};

export default HomePage;