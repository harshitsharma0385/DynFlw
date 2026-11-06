
import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dynflw-cart')) || [];
        } catch {
            return [];
        }
    });

    const [table, setTable] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dynflw-table')) || null;
        } catch {
            return null;
        }
    });

    const [tableSession, setTableSession] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dynflw-table-session')) || null;
        } catch {
            return null;
        }
    });

    // Persist cart items
    useEffect(() => {
        localStorage.setItem('dynflw-cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Persist table information
    useEffect(() => {
        if (table) {
            localStorage.setItem('dynflw-table', JSON.stringify(table));
        } else {
            localStorage.removeItem('dynflw-table');
        }
    }, [table]);

    // Persist active table session
    useEffect(() => {
        if (tableSession) {
            localStorage.setItem(
                'dynflw-table-session',
                JSON.stringify(tableSession)
            );
        } else {
            localStorage.removeItem('dynflw-table-session');
        }
    }, [tableSession]);

    // Add a dish or increase its quantity
    function addToCart(dish) {
        setCartItems(currentItems => {
            const existingItem = currentItems.find(
                item => item.dishId === dish.dishId
            );

            if (existingItem) {
                return currentItems.map(item =>
                    item.dishId === dish.dishId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...currentItems,
                {
                    ...dish,
                    quantity: 1,
                    cookingInstructions: ''
                }
            ];
        });
    }

    // Update cooking instructions for an individual dish
    function updateCookingInstructions(dishId, instructions) {
        setCartItems(currentItems =>
            currentItems.map(item =>
                item.dishId === dishId
                    ? { ...item, cookingInstructions: instructions }
                    : item
            )
        );
    }

    function updateQuantity(dishId, quantity) {
        if (quantity <= 0) {
            removeFromCart(dishId);
            return;
        }

        setCartItems(currentItems =>
            currentItems.map(item =>
                item.dishId === dishId
                    ? { ...item, quantity }
                    : item
            )
        );
    }

    function removeFromCart(dishId) {
        setCartItems(currentItems =>
            currentItems.filter(item => item.dishId !== dishId)
        );
    }

    function clearCart() {
        setCartItems([]);
    }

    const total = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                updateQuantity,
                updateCookingInstructions,
                removeFromCart,
                clearCart,
                total,
                table,
                setTable,
                tableSession,
                setTableSession
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
