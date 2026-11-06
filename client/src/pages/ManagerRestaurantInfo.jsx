import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

function ManagerRestaurantInfo() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        restaurantName: '',
        tagline: '',
        logo: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        invoiceFooter: '',
        cgstRate: 0,
        sgstRate: 0
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const token = localStorage.getItem('managerToken');

    useEffect(() => {
        if (!token) {
            navigate('/manager/login', { replace: true });
            return;
        }

        fetchRestaurantInfo();
    }, []);

    // ==========================================
    // FETCH RESTAURANT INFORMATION
    // ==========================================

    const fetchRestaurantInfo = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(
                `${API_BASE_URL}/api/manager/restaurant-info`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('managerToken')}`
                    }
                }
            );

            const data = await response.json();

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('managerToken');
                localStorage.removeItem('managerUsername');
                navigate('/manager/login', { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to load restaurant information.'
                );
            }

            setFormData({
                restaurantName: data.restaurantName || '',
                tagline: data.tagline || '',
                logo: data.logo || '',
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || '',
                gstin: data.gstin || '',
                invoiceFooter: data.invoiceFooter || '',
                cgstRate: data.cgstRate ?? 0,
                sgstRate: data.sgstRate ?? 0
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // HANDLE INPUT CHANGES
    // ==========================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        setMessage('');
        setError('');
    };

    // ==========================================
    // SAVE RESTAURANT INFORMATION
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            setMessage('');
            setError('');

            const payload = {
                ...formData,
                cgstRate: Number(formData.cgstRate),
                sgstRate: Number(formData.sgstRate)
            };

            const response = await fetch(
                `${API_BASE_URL}/api/manager/restaurant-info`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('managerToken')}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('managerToken');
                localStorage.removeItem('managerUsername');
                navigate('/manager/login', { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to save restaurant information.'
                );
            }

            const restaurant = data.restaurant;

            setFormData({
                restaurantName: restaurant.restaurantName || '',
                tagline: restaurant.tagline || '',
                logo: restaurant.logo || '',
                phone: restaurant.phone || '',
                email: restaurant.email || '',
                address: restaurant.address || '',
                gstin: restaurant.gstin || '',
                invoiceFooter: restaurant.invoiceFooter || '',
                cgstRate: restaurant.cgstRate ?? 0,
                sgstRate: restaurant.sgstRate ?? 0
            });

            setMessage('Restaurant information saved successfully!');

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // LOGOUT
    // ==========================================

    const handleLogout = () => {
        localStorage.removeItem('managerToken');
        localStorage.removeItem('managerUsername');
        navigate('/manager/login', { replace: true });
    };

    // ==========================================
    // LOADING SCREEN
    // ==========================================

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.loaderContent}>
                    <div style={styles.loader}></div>
                    <p>Loading restaurant information...</p>
                </div>
            </div>
        );
    }

    // ==========================================
    // MAIN UI
    // ==========================================

    return (
        <div style={styles.page}>

            {/* HEADER */}

            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <div>
                        <h1 style={styles.logo}>DynFlw</h1>
                        <p style={styles.tagline}>Dining, in Sync.</p>
                    </div>

                    <div style={styles.headerActions}>
                        <button
                            type="button"
                            style={styles.backButton}
                            onClick={() => navigate('/manager')}
                        >
                            <span>←</span> Dashboard
                        </button>

                        <button
                            type="button"
                            style={styles.logoutButton}
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}

            <main style={styles.main}>

                <div style={styles.pageIntro}>
                    <div>
                        <div style={styles.eyebrow}>
                            MANAGER SETTINGS
                        </div>

                        <h2 style={styles.heading}>
                            Restaurant Information
                        </h2>

                        <p style={styles.subtitle}>
                            Customize your restaurant profile, contact details
                            and billing preferences.
                        </p>
                    </div>

                    <div style={styles.statusBadge}>
                        <span style={styles.statusDot}></span>
                        Restaurant Profile
                    </div>
                </div>

                {/* SUCCESS / ERROR MESSAGES */}

                {message && (
                    <div style={styles.successMessage}>
                        <span>✓</span>
                        {message}
                    </div>
                )}

                {error && (
                    <div style={styles.errorMessage}>
                        <span>!</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>

                    {/* RESTAURANT IDENTITY */}

                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionIcon}>✦</div>

                            <div>
                                <h3 style={styles.sectionTitle}>
                                    Restaurant Identity
                                </h3>

                                <p style={styles.sectionDescription}>
                                    Your restaurant's name, branding and identity.
                                </p>
                            </div>
                        </div>

                        <div style={styles.fieldGrid}>
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Restaurant Name <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="restaurantName"
                                    value={formData.restaurantName}
                                    onChange={handleChange}
                                    placeholder="Enter restaurant name"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Tagline
                                </label>

                                <input
                                    type="text"
                                    name="tagline"
                                    value={formData.tagline}
                                    onChange={handleChange}
                                    placeholder="Your restaurant tagline"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.fieldFull}>
                                <label style={styles.label}>
                                    Restaurant Logo URL
                                </label>

                                <input
                                    type="url"
                                    name="logo"
                                    value={formData.logo}
                                    onChange={handleChange}
                                    placeholder="https://example.com/logo.png"
                                    style={styles.input}
                                />

                                <p style={styles.helperText}>
                                    Provide a publicly accessible image URL.
                                </p>
                            </div>
                        </div>

                        {formData.logo && (
                            <div style={styles.logoPreview}>
                                <div>
                                    <p style={styles.previewLabel}>
                                        LOGO PREVIEW
                                    </p>

                                    <p style={styles.previewDescription}>
                                        This is how your restaurant logo will appear.
                                    </p>
                                </div>

                                <img
                                    src={formData.logo}
                                    alt="Restaurant logo preview"
                                    style={styles.logoImage}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </section>

                    {/* CONTACT INFORMATION */}

                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionIcon}>⌖</div>

                            <div>
                                <h3 style={styles.sectionTitle}>
                                    Contact Information
                                </h3>

                                <p style={styles.sectionDescription}>
                                    Details customers can use to reach your restaurant.
                                </p>
                            </div>
                        </div>

                        <div style={styles.fieldGrid}>
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Email Address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="restaurant@example.com"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.fieldFull}>
                                <label style={styles.label}>
                                    Restaurant Address
                                </label>

                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter complete restaurant address"
                                    rows={3}
                                    style={styles.textarea}
                                />
                            </div>
                        </div>
                    </section>

                    {/* BILLING INFORMATION */}

                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionIcon}>₹</div>

                            <div>
                                <h3 style={styles.sectionTitle}>
                                    Billing & Tax Information
                                </h3>

                                <p style={styles.sectionDescription}>
                                    Configure GST details and invoice preferences.
                                </p>
                            </div>
                        </div>

                        <div style={styles.fieldGrid}>
                            <div style={styles.fieldFull}>
                                <label style={styles.label}>
                                    GSTIN
                                </label>

                                <input
                                    type="text"
                                    name="gstin"
                                    value={formData.gstin}
                                    onChange={handleChange}
                                    placeholder="Enter 15-character GSTIN"
                                    maxLength={15}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    CGST Rate (%)
                                </label>

                                <input
                                    type="number"
                                    name="cgstRate"
                                    value={formData.cgstRate}
                                    onChange={handleChange}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    SGST Rate (%)
                                </label>

                                <input
                                    type="number"
                                    name="sgstRate"
                                    value={formData.sgstRate}
                                    onChange={handleChange}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.taxPreview}>
                            <div>
                                <span style={styles.taxPreviewLabel}>
                                    TOTAL GST
                                </span>

                                <p style={styles.taxPreviewDescription}>
                                    Combined CGST and SGST rate
                                </p>
                            </div>

                            <strong style={styles.taxTotal}>
                                {(Number(formData.cgstRate) + Number(formData.sgstRate)).toFixed(2)}%
                            </strong>
                        </div>

                        <div style={styles.fieldFull}>
                            <label style={styles.label}>
                                Invoice Footer Message
                            </label>

                            <textarea
                                name="invoiceFooter"
                                value={formData.invoiceFooter}
                                onChange={handleChange}
                                placeholder="Thank you for dining with us!"
                                rows={3}
                                style={styles.textarea}
                            />

                            <p style={styles.helperText}>
                                This message will appear at the bottom of your invoices.
                            </p>
                        </div>
                    </section>

                    {/* FORM ACTIONS */}

                    <div style={styles.formActions}>
                        <button
                            type="button"
                            onClick={() => navigate('/manager')}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                ...styles.saveButton,
                                opacity: saving ? 0.7 : 1,
                                cursor: saving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {saving ? 'Saving Changes...' : '✓ Save Changes'}
                        </button>
                    </div>

                </form>
            </main>

            {/* FOOTER */}

            <footer style={styles.footer}>
                <span>Powered by</span>
                <strong> DynFlw</strong>
                <span style={styles.footerDot}>·</span>
                <span>Dining, in Sync.</span>
            </footer>
        </div>
    );
}

// ==========================================
// STYLES
// ==========================================

const styles = {
    page: {
        minHeight: '100vh',
        background: '#000308',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
    },

    header: {
        background: '#15121a',
        borderBottom: '1px solid #302735',
        padding: '18px 5%'
    },

    headerInner: {
        maxWidth: '1250px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
    },

    logo: {
        margin: 0,
        fontSize: '29px',
        fontWeight: '800',
        letterSpacing: '-1px',
        color: '#ffffff'
    },

    tagline: {
        margin: '4px 0 0',
        color: '#c19bb8',
        fontSize: '12px',
        letterSpacing: '1px'
    },

    headerActions: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
    },

    backButton: {
        padding: '10px 16px',
        background: '#29232b',
        color: '#ffffff',
        border: '1px solid #514451',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },

    logoutButton: {
        padding: '10px 18px',
        background: '#3a2028',
        color: '#ffaaaa',
        border: '1px solid #63333e',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },

    main: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '45px 22px 55px'
    },

    pageIntro: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '18px',
        marginBottom: '30px'
    },

    eyebrow: {
        color: '#c47eb3',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '2px',
        marginBottom: '10px'
    },

    heading: {
        margin: 0,
        fontSize: '30px',
        fontWeight: '750',
        letterSpacing: '-0.8px'
    },

    subtitle: {
        color: '#9d96a3',
        marginTop: '10px',
        marginBottom: 0,
        fontSize: '14px',
        lineHeight: 1.6
    },

    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        background: '#172a24',
        color: '#8ee0b0',
        border: '1px solid #285541',
        padding: '10px 14px',
        borderRadius: '30px',
        fontSize: '12px',
        fontWeight: '600'
    },

    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#55d58b',
        boxShadow: '0 0 8px #55d58b'
    },

    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '22px'
    },

    section: {
        background: '#111019',
        border: '1px solid #302735',
        borderRadius: '15px',
        padding: '26px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
    },

    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '27px',
        paddingBottom: '20px',
        borderBottom: '1px solid #302735'
    },

    sectionIcon: {
        width: '43px',
        height: '43px',
        borderRadius: '12px',
        background: '#342438',
        color: '#e3a4d2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        flexShrink: 0
    },

    sectionTitle: {
        margin: 0,
        color: '#f0d0e7',
        fontSize: '17px',
        fontWeight: '700'
    },

    sectionDescription: {
        margin: '6px 0 0',
        color: '#918996',
        fontSize: '12px',
        lineHeight: 1.5
    },

    fieldGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '20px'
    },

    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        minWidth: 0
    },

    fieldFull: {
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        marginTop: '20px',
        minWidth: 0
    },

    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#e1dce5'
    },

    required: {
        color: '#f18caa'
    },

    input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px 14px',
        background: '#090810',
        color: '#ffffff',
        border: '1px solid #403747',
        borderRadius: '8px',
        outline: 'none',
        fontSize: '13px'
    },

    textarea: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px 14px',
        background: '#090810',
        color: '#ffffff',
        border: '1px solid #403747',
        borderRadius: '8px',
        outline: 'none',
        fontSize: '13px',
        resize: 'vertical',
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.5
    },

    helperText: {
        margin: '0',
        color: '#817a89',
        fontSize: '11px'
    },

    logoPreview: {
        marginTop: '25px',
        padding: '18px',
        background: '#090810',
        border: '1px solid #302735',
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
    },

    previewLabel: {
        color: '#c47eb3',
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '1.5px',
        margin: '0 0 7px'
    },

    previewDescription: {
        color: '#918996',
        fontSize: '12px',
        margin: 0
    },

    logoImage: {
        display: 'block',
        maxWidth: '150px',
        maxHeight: '90px',
        objectFit: 'contain',
        padding: '10px',
        background: '#ffffff',
        borderRadius: '8px'
    },

    taxPreview: {
        marginTop: '22px',
        padding: '17px 20px',
        background: '#211b2a',
        border: '1px solid #49354e',
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px'
    },

    taxPreviewLabel: {
        color: '#d6a0c8',
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '1.5px'
    },

    taxPreviewDescription: {
        color: '#a79aa9',
        fontSize: '12px',
        margin: '6px 0 0'
    },

    taxTotal: {
        color: '#f0b6df',
        fontSize: '24px',
        fontWeight: '800'
    },

    formActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        flexWrap: 'wrap',
        paddingTop: '5px'
    },

    cancelButton: {
        padding: '13px 23px',
        background: '#29232b',
        color: '#d5ced8',
        border: '1px solid #514451',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600'
    },

    saveButton: {
        padding: '13px 24px',
        background: '#c02691',
        color: '#ffffff',
        border: '1px solid #d34aa9',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '700',
        boxShadow: '0 4px 15px rgba(192,38,145,0.2)'
    },

    successMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#123526',
        border: '1px solid #246342',
        color: '#8ee0b0',
        padding: '14px 17px',
        borderRadius: '9px',
        marginBottom: '20px',
        fontSize: '13px'
    },

    errorMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#3b1b23',
        border: '1px solid #713340',
        color: '#ffaaaa',
        padding: '14px 17px',
        borderRadius: '9px',
        marginBottom: '20px',
        fontSize: '13px'
    },

    loading: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#000308',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
    },

    loaderContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        color: '#aaa',
        fontSize: '14px'
    },

    loader: {
        width: '32px',
        height: '32px',
        border: '3px solid #403747',
        borderTop: '3px solid #c02691',
        borderRadius: '50%'
    },

    footer: {
        textAlign: 'center',
        padding: '25px',
        borderTop: '1px solid #211c27',
        color: '#77717e',
        fontSize: '12px'
    },

    footerDot: {
        margin: '0 8px',
        color: '#c47eb3'
    }
};

export default ManagerRestaurantInfo;