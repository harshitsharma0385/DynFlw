
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ManagerDashboard() {
    const navigate = useNavigate();

    const username = localStorage.getItem('managerUsername') || 'Manager';
    const token = localStorage.getItem('managerToken');

    useEffect(() => {
        if (!token) {
            navigate('/manager/login', { replace: true });
        }
    }, [token, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('managerToken');
        localStorage.removeItem('managerUsername');
        navigate('/manager/login', { replace: true });
    };

    if (!token) return null;

    const sections = [
        {
            title: 'Billing & Payments',
            description: 'Manage active bills, process checkouts and generate invoices.',
            path: '/manager/billing',
            icon: 'receipt-text',
            number: '01',
            tag: 'Finance'
        },
        {
            title: 'Table Management',
            description: 'Monitor table occupancy, availability and QR codes.',
            path: '/manager/tables',
            icon: 'armchair',
            number: '02',
            tag: 'Operations'
        },
        {
            title: 'Kitchen Overview',
            description: 'Track incoming orders and monitor kitchen progress.',
            path: '/manager/kitchen',
            icon: 'chef-hat',
            number: '03',
            tag: 'Live operations'
        },
        {
            title: 'Dish Management',
            description: 'Manage your menu, pricing, categories and dish QR codes.',
            path: '/manager/dishes',
            icon: 'utensils',
            number: '04',
            tag: 'Menu'
        },
        {
            title: 'Restaurant Settings',
            description: 'Customize restaurant details, branding and tax information.',
            path: '/manager/restaurant-info',
            icon: 'store',
            number: '05',
            tag: 'Configuration'
        }
    ];

    return (
        <div className="manager-dashboard">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@500;600;700;800&display=swap');

                .manager-dashboard {
                    min-height: 100vh;
                    background: var(--bg, #FFF8F0);
                    color: var(--text, #33251F);
                    font-family: var(--font-sans, 'Manrope', sans-serif);
                }

                .manager-header {
                    height: 76px;
                    padding: 0 6%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--surface, #FFFFFF);
                    border-bottom: 1px solid var(--border, #E9D8C9);
                }

                .manager-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .brand-mark {
                    width: 40px;
                    height: 40px;
                    display: grid;
                    place-items: center;
                    background: var(--accent, #D96C45);
                    color: white;
                    border-radius: 12px;
                    font-size: 20px;
                    font-weight: 800;
                }

                .brand-name {
                    margin: 0;
                    font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
                    font-size: 25px;
                    font-weight: 800;
                    letter-spacing: -1px;
                }

                .brand-tagline {
                    margin: 1px 0 0;
                    color: var(--muted, #8C786B);
                    font-size: 11px;
                    letter-spacing: .3px;
                }

                .manager-profile {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .profile-info {
                    text-align: right;
                }

                .profile-label {
                    display: block;
                    color: var(--muted, #8C786B);
                    font-size: 11px;
                }

                .profile-name {
                    font-size: 13px;
                    font-weight: 700;
                }

                .profile-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: var(--surface-2, #F3E5D8);
                    display: grid;
                    place-items: center;
                    color: var(--accent-text, #A94C37);
                    font-weight: 800;
                }

                .logout-button {
                    padding: 9px 15px;
                    border: 1px solid var(--border-strong, #D7C5B7);
                    background: transparent;
                    color: var(--text, #33251F);
                    border-radius: 9px;
                    font: inherit;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .logout-button:hover {
                    background: var(--accent-soft, #F3E5D8);
                    border-color: var(--accent, #D96C45);
                }

                .manager-main {
                    width: min(1120px, 88%);
                    margin: 0 auto;
                    padding: 54px 0 70px;
                }

                .welcome-label {
                    color: var(--accent-text, #A94C37);
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.8px;
                    text-transform: uppercase;
                }

                .welcome-title {
                    margin: 12px 0 8px;
                    font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
                    font-size: clamp(30px, 4vw, 43px);
                    line-height: 1.15;
                    letter-spacing: -1.5px;
                }

                .welcome-subtitle {
                    margin: 0;
                    color: var(--muted, #8C786B);
                    font-size: 14px;
                    line-height: 1.7;
                }

                .section-heading {
                    margin: 43px 0 17px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .section-heading h2 {
                    margin: 0;
                    font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
                    font-size: 19px;
                }

                .section-count {
                    color: var(--muted, #8C786B);
                    font-size: 12px;
                }

                .manager-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 17px;
                }

                .manager-card {
                    position: relative;
                    min-height: 185px;
                    padding: 24px;
                    text-align: left;
                    background: var(--surface, #FFFFFF);
                    border: 1px solid var(--border, #E9D8C9);
                    border-radius: 15px;
                    color: var(--text, #33251F);
                    font: inherit;
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
                }

                .manager-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--accent, #D96C45);
                    box-shadow: 0 12px 30px rgba(75, 43, 29, .07);
                }

                .card-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .card-icon {
                    width: 45px;
                    height: 45px;
                    display: grid;
                    place-items: center;
                    border-radius: 12px;
                    background: var(--accent-soft, #F3E5D8);
                    color: var(--accent-text, #A94C37);
                    font-size: 21px;
                }

                .card-number {
                    color: var(--muted, #8C786B);
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 1px;
                }

                .card-tag {
                    display: inline-block;
                    margin-top: 18px;
                    color: var(--accent-text, #A94C37);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .8px;
                    text-transform: uppercase;
                }

                .card-title {
                    margin: 7px 0;
                    font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
                    font-size: 19px;
                    font-weight: 700;
                }

                .card-description {
                    max-width: 390px;
                    margin: 0;
                    color: var(--muted, #8C786B);
                    font-size: 12px;
                    line-height: 1.7;
                }

                .card-arrow {
                    position: absolute;
                    right: 24px;
                    bottom: 24px;
                    color: var(--accent-text, #A94C37);
                    font-size: 18px;
                    transition: transform .2s ease;
                }

                .manager-card:hover .card-arrow {
                    transform: translateX(5px);
                }

                .manager-footer {
                    padding: 23px 6%;
                    border-top: 1px solid var(--border, #E9D8C9);
                    color: var(--muted, #8C786B);
                    font-size: 11px;
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                }

                .footer-brand {
                    font-weight: 800;
                    color: var(--text-soft, #5C463A);
                }

                @media (max-width: 650px) {
                    .manager-header {
                        padding: 0 5%;
                        height: 68px;
                    }

                    .brand-name {
                        font-size: 21px;
                    }

                    .profile-info {
                        display: none;
                    }

                    .manager-profile {
                        gap: 9px;
                    }

                    .logout-button {
                        padding: 8px 10px;
                    }

                    .manager-main {
                        width: 90%;
                        padding: 38px 0 50px;
                    }

                    .manager-grid {
                        grid-template-columns: 1fr;
                    }

                    .manager-card {
                        min-height: 175px;
                    }

                    .section-heading {
                        margin-top: 32px;
                    }

                    .manager-footer {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                }
            `}</style>

            <header className="manager-header">
                <div className="manager-brand">
                    <div className="brand-mark">D</div>
                    <div>
                        <h1 className="brand-name">DynFlw</h1>
                        <p className="brand-tagline">Dining, in Sync.</p>
                    </div>
                </div>

                <div className="manager-profile">
                    <div className="profile-info">
                        <span className="profile-label">Signed in as</span>
                        <span className="profile-name">{username}</span>
                    </div>
                    <div className="profile-avatar">
                        {username.charAt(0).toUpperCase()}
                    </div>
                    <button className="logout-button" onClick={handleLogout}>
                        Log out ↗
                    </button>
                </div>
            </header>

            <main className="manager-main">
                <div className="welcome-label">Restaurant workspace</div>
                <h2 className="welcome-title">
                    Welcome back, {username}.
                </h2>
                <p className="welcome-subtitle">
                    Manage your restaurant, streamline operations and keep
                    everything running smoothly.
                </p>

                <div className="section-heading">
                    <h2>Manage your restaurant</h2>
                    <span className="section-count">05 modules</span>
                </div>

                <div className="manager-grid">
                    {sections.map((section) => (
                        <button
                            key={section.path}
                            className="manager-card"
                            onClick={() => navigate(section.path)}
                            aria-label={`Open ${section.title}`}
                        >
                            <div className="card-top">
                                <div className="card-icon">
                                    {section.icon === 'receipt-text' && '▤'}
                                    {section.icon === 'armchair' && '▥'}
                                    {section.icon === 'chef-hat' && '♨'}
                                    {section.icon === 'utensils' && '♨'}
                                    {section.icon === 'store' && '⌂'}
                                </div>
                                <span className="card-number">
                                    {section.number}
                                </span>
                            </div>

                            <span className="card-tag">{section.tag}</span>
                            <h3 className="card-title">{section.title}</h3>
                            <p className="card-description">
                                {section.description}
                            </p>
                            <span className="card-arrow">→</span>
                        </button>
                    ))}
                </div>
            </main>

            <footer className="manager-footer">
                <span className="footer-brand">
                    DynFlw · Dining, in Sync.
                </span>
                <span>Restaurant Management Workspace</span>
                <span>Powered by DynFlw</span>
            </footer>
        </div>
    );
}

export default ManagerDashboard;
