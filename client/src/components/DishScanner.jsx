import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useCart } from '../context/CartContext';
import API_BASE_URL from '../config/api';

function DishScanner() {
    const scannerRef = useRef(null);
    const lastDecodedText = useRef(null);
    const emptyFrames = useRef(0);
    const isMounted = useRef(true);

    const { addToCart } = useCart();

    const [error, setError] = useState('');
    const [starting, setStarting] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [message, setMessage] = useState('');

    // Keep track of component mounting and release camera on unmount.
    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;

            const scanner = scannerRef.current;

            if (scanner) {
                const cleanup = async () => {
                    try {
                        if (scanner.isScanning) {
                            await scanner.stop();
                        }
                        scanner.clear();
                    } catch (err) {
                        console.error('Scanner cleanup error:', err);
                    }
                };

                cleanup();
                scannerRef.current = null;
            }
        };
    }, []);

    // Fetch and add the scanned dish.
    async function handleScan(decodedText) {
        if (lastDecodedText.current === decodedText) return;

        lastDecodedText.current = decodedText;
        emptyFrames.current = 0;

        setError('');
        setMessage('Dish detected! Adding to cart...');

        try {
            const url = new URL(decodedText);
            const match = url.pathname.match(/^\/dish\/([^/]+)\/?$/);

            if (!match) {
                throw new Error('This QR code is not a valid dish QR code.');
            }

            const dishId = decodeURIComponent(match[1]);

            const response = await fetch(
                `${API_BASE_URL}/api/dishes/${dishId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to fetch dish details.'
                );
            }

            const dish = data.dish || data;

            if (!dish || !dish.dishId) {
                throw new Error('Invalid dish information received.');
            }

            if (dish.isAvailable === false || dish.isArchived === true) {
                throw new Error('This dish is currently unavailable.');
            }

            if (isMounted.current) {
                addToCart(dish);
                setMessage(`${dish.name} added to your cart!`);
            }

        } catch (err) {
            if (isMounted.current) {
                setError(err.message || 'Unable to add this dish.');
                setMessage('');
            }
        }
    }

    // Start camera only after React has rendered the scanner element.
    useEffect(() => {
        if (!cameraOn) return;

        let cancelled = false;
        let scanner = null;

        async function initializeCamera() {
            try {
                setStarting(true);
                setError('');
                setMessage('');

                lastDecodedText.current = null;
                emptyFrames.current = 0;

                // Wait until the scanner element is available.
                await new Promise(resolve => setTimeout(resolve, 100));

                if (cancelled) return;

                const reader = document.getElementById('dish-qr-reader');

                if (!reader) {
                    throw new Error('Scanner area not found.');
                }

                reader.innerHTML = '';

                scanner = new Html5Qrcode('dish-qr-reader');
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 220, height: 220 }
                    },
                    handleScan,
                    () => {
                        emptyFrames.current++;

                        if (emptyFrames.current >= 8) {
                            lastDecodedText.current = null;
                        }
                    }
                );

                if (cancelled) {
                    if (scanner.isScanning) {
                        await scanner.stop();
                    }
                    scanner.clear();
                    return;
                }

            } catch (err) {
                console.error('Camera startup error:', err);

                if (!cancelled) {
                    setError(
                        err?.message || 'Unable to start the camera.'
                    );
                    setCameraOn(false);
                }

            } finally {
                if (!cancelled) {
                    setStarting(false);
                }
            }
        }

        initializeCamera();

        return () => {
            cancelled = true;

            if (scanner) {
                const cleanup = async () => {
                    try {
                        if (scanner.isScanning) {
                            await scanner.stop();
                        }
                        scanner.clear();
                    } catch (err) {
                        console.error('Camera stop error:', err);
                    }

                    if (scannerRef.current === scanner) {
                        scannerRef.current = null;
                    }
                };

                cleanup();
            }
        };
    }, [cameraOn]);

    // Manually turn camera off.
    async function stopCamera() {
        setStarting(true);

        const scanner = scannerRef.current;

        try {
            if (scanner?.isScanning) {
                await scanner.stop();
            }

            scanner?.clear();

            scannerRef.current = null;
            setCameraOn(false);
            setMessage('Camera turned off.');
            setError('');

        } catch (err) {
            console.error('Camera shutdown error:', err);
            setError('Unable to turn off the camera. Please try again.');

        } finally {
            setStarting(false);
        }
    }

    // Request camera startup.
    function startCamera() {
        setError('');
        setMessage('');
        setStarting(true);
        setCameraOn(true);
    }

    return (
        <div style={{
            width: '100%',
            maxWidth: '550px',
            margin: '0 auto',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text)'
        }}>
            <style>
                {`
                    .dish-scanner-button {
                        transition: filter 0.16s ease, transform 0.2s ease;
                    }

                    .dish-scanner-button:hover:not(:disabled) {
                        filter: brightness(1.08);
                    }

                    .dish-scanner-button:active:not(:disabled) {
                        transform: scale(0.98);
                    }

                    #dish-qr-reader video {
                        display: block;
                        width: 100% !important;
                    }
                `}
            </style>

            <div style={{ marginBottom: '14px' }}>
                <h2 style={{
                    margin: '0 0 6px',
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em'
                }}>
                    Scan a dish
                </h2>

                <p style={{
                    margin: 0,
                    color: 'var(--muted)',
                    fontSize: '13px',
                    lineHeight: 1.6
                }}>
                    Turn on your camera when you're ready to scan a dish QR code.
                </p>
            </div>

            {cameraOn && (
                <div style={{
                    overflow: 'hidden',
                    borderRadius: '12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border-strong)'
                }}>
                    <div id="dish-qr-reader" />
                </div>
            )}

            {!cameraOn && (
                <div style={{
                    padding: '35px 15px',
                    textAlign: 'center',
                    background: 'var(--surface-2)',
                    border: '1px dashed var(--border-strong)',
                    borderRadius: '12px',
                    color: 'var(--muted)'
                }}>
                    <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ marginBottom: '8px' }}
                    >
                        <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <circle cx="12" cy="13" r="3.5" />
                    </svg>

                    <p style={{ margin: 0, fontSize: '14px' }}>
                        Camera is currently off.
                    </p>
                </div>
            )}

            <button
                className="dish-scanner-button"
                onClick={cameraOn ? stopCamera : startCamera}
                disabled={starting}
                style={{
                    width: '100%',
                    marginTop: '14px',
                    padding: '14px',
                    border: cameraOn
                        ? '1px solid var(--danger)'
                        : '1px solid transparent',
                    borderRadius: '12px',
                    background: cameraOn ? 'transparent' : 'var(--accent)',
                    color: cameraOn ? 'var(--danger)' : 'var(--accent-ink)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: starting ? 'not-allowed' : 'pointer',
                    opacity: starting ? 0.7 : 1
                }}
            >
                {starting
                    ? 'Starting Camera...'
                    : cameraOn
                        ? 'Turn Camera Off'
                        : 'Start Camera'}
            </button>

            {error && (
                <p role="alert" style={{
                    margin: '14px 0 0',
                    color: 'var(--danger)',
                    background: 'var(--surface-2)',
                    border: '1px solid color-mix(in srgb, var(--danger) 45%, transparent)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '13px'
                }}>
                    {error}
                </p>
            )}

            {message && !error && (
                <p role="status" style={{
                    margin: '14px 0 0',
                    color: 'var(--accent-text)',
                    background: 'var(--accent-soft)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'center'
                }}>
                    {message}
                </p>
            )}

            <p style={{
                margin: '14px 0 0',
                color: 'var(--muted)',
                fontSize: '12px',
                textAlign: 'center'
            }}>
                Your camera is only active while scanning is enabled.
            </p>
        </div>
    );
}

export default DishScanner;