
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import { useCart } from '../context/CartContext';

function TableEntry() {
    const { qrToken } = useParams();
    const navigate = useNavigate();

    const [error, setError] = useState('');

    const { setTable, setTableSession } = useCart();

    useEffect(() => {
        let cancelled = false;

        async function startTableSession() {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/tables/qr/${qrToken}/session`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || 'Unable to identify your table.'
                    );
                }

                if (cancelled) return;

                setTable(data.table);
                setTableSession(data.session);

                navigate('/', { replace: true });
            } catch (error) {
                if (!cancelled) {
                    setError(error.message);
                }
            }
        }

        startTableSession();

        return () => {
            cancelled = true;
        };
    }, [qrToken, navigate, setTable, setTableSession]);

    if (error) {
        return <h2>{error}</h2>;
    }

    return <h2>Identifying your table...</h2>;
}

export default TableEntry;
