import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import API_BASE_URL from "../config/api";

const pageStyles = `
.dish-page {
    min-height: 100vh;
    padding: 48px 16px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

.dish-panel {
    width: 100%;
    max-width: 520px;
    overflow: hidden;
    background: var(--moss);
    border: 1px solid var(--line);
    border-radius: 2px;
    animation: dish-settle 600ms ease-out both;
}

@keyframes dish-settle {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
}

.dish-image {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-bottom: 1px solid var(--line);
}

.dish-body {
    padding: 40px 40px 36px;
    text-align: center;
}

.dish-name {
    margin: 0 0 10px;
    font-size: 2.7rem;
    line-height: 1.1;
}

.dish-price {
    margin: 0;
    font-size: 1.9rem;
    color: var(--champagne);
}

.dish-description {
    max-width: 38ch;
    margin: 28px auto 0;
    padding-top: 28px;
    border-top: 1px solid var(--line);
    font-size: 1.02rem;
    line-height: 1.75;
}

.dish-category {
    margin: 16px 0 32px;
    font-size: 0.9rem;
    color: var(--mist);
}

.dish-add-button {
    width: 100%;
    padding: 16px 24px;
    border: 1px solid var(--champagne);
    border-radius: 2px;
    background: var(--champagne);
    color: var(--bottle);
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background-color 160ms ease;
}

.dish-add-button:hover {
    background: var(--champagne-hover);
}

.dish-message {
    margin: 18px 0 0;
    color: var(--champagne);
}

.dish-link-row {
    margin-top: 20px;
}

.dish-link {
    display: inline-block;
    padding-bottom: 3px;
    border-bottom: 1px solid var(--champagne);
    color: var(--champagne);
    text-decoration: none;
    transition: color 160ms ease;
}

.dish-link:hover {
    color: var(--ivory);
}

.dish-panel--state {
    max-width: 480px;
    padding: 56px 40px;
    text-align: center;
}

.dish-state-text {
    margin: 0;
    color: var(--mist);
}

.dish-state-heading {
    margin: 0;
    font-size: 1.9rem;
    line-height: 1.25;
}

.dish-panel--state .dish-link-row {
    margin-top: 28px;
}

@media (max-width: 520px) {
    .dish-page {
        padding: 16px 12px;
    }

    .dish-body {
        padding: 32px 22px 28px;
    }

    .dish-name {
        font-size: 2.1rem;
    }

    .dish-panel--state {
        padding: 44px 22px;
    }
}
`;

function DishPage() {
    const { dishId } = useParams();
    const location = useLocation();
    const { addToCart, cartItems } = useCart();
    const [addedMessage, setAddedMessage] = useState('');
    const [dish, setDish] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoAdded, setAutoAdded] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        async function fetchDish() {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/dishes/${dishId}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to load dish.');
                }

                setDish(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        fetchDish();
    }, [dishId]);

    useEffect(() => {
        if(!dish || !dishId || autoAdded) return;
        const scanKey = `dynflw-scanned-${dishId}`;
        if(sessionStorage.getItem(scanKey)) return;
        addToCart(dish);
        sessionStorage.setItem(scanKey, 'true');
        setAutoAdded(true);
        setAddedMessage(`${dish.name} automatically added to your cart!`);

    }, [dish, dishId, autoAdded, addToCart]);


    useEffect(() => {
        const scanId = location.state?.scanId;
        if(!dish || !scanId || location.state?.source !== 'scanner'){
            return;
        }
        const processedKey = `dynflw-processed-scan-${scanId}`;
        if(sessionStorage.getItem(processedKey)){
            return;
        }
        sessionStorage.setItem(processedKey, 'true');
        addToCart(dish);
        navigate('/cart', { replace: true });
    }, [dish, location.state, addToCart]);

    function renderState(content, showHomeLink = true) {
        return (
            <div className="dish-page">
                <style>{pageStyles}</style>

                <div className="dish-panel dish-panel--state">
                    {content}

                    {showHomeLink && (
                        <p className="dish-link-row">
                            <Link to="/" className="dish-link">Back to Home</Link>
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return renderState(
            <p className="dish-state-text" role="status">Loading dish...</p>,
            false
        );
    }

    if (error) {
        return renderState(<h2 className="dish-state-heading" role="alert">{error}</h2>);
    }

    if (dish.isArchived) {
        return renderState(
            <h2 className="dish-state-heading">Sorry, this dish is no longer available.</h2>
        );
    }

    if (!dish.isAvailable) {
        return renderState(
            <h2 className="dish-state-heading">This dish is currently unavailable.</h2>
        );
    }

    return (
        <div className="dish-page">
            <style>{pageStyles}</style>

            <div className="dish-panel">
                {dish.image && (
                    <img
                        src={dish.image}
                        alt={dish.name}
                        className="dish-image"
                    />
                )}

                <div className="dish-body">
                    <h1 className="dish-name">{dish.name}</h1>

                    <h2 className="dish-price">₹{dish.price}</h2>

                    <p className="dish-description">
                        {dish.description || 'No description available.'}
                    </p>

                    <p className="dish-category">Category: {dish.category}</p>

                    <button
                        className="dish-add-button"
                        onClick={() => {
                            addToCart(dish);
                            setAddedMessage(`${dish.name} added to cart!`);
                        }}
                    >
                        Add to Cart
                    </button>

                    {addedMessage && (
                        <p className="dish-message" role="status">{addedMessage}</p>
                    )}

                    <p className="dish-link-row">
                        <Link to="/cart" className="dish-link">View Cart</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default DishPage;