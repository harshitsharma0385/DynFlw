
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

function ManagerDishes() {
    const navigate = useNavigate();
    const token = localStorage.getItem("managerToken");

    const [dishes, setDishes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [view, setView] = useState("active");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [newDish, setNewDish] = useState({
        name: "",
        price: "",
        description: "",
        category: "",
        image: ""
    });
    const [createdQR, setCreatedQR] = useState("");
    const [createdDishName, setCreatedDishName] = useState("");
    const [formMessage, setFormMessage] = useState("");
    const [saving, setSaving] = useState(false);

    const [editingDish, setEditingDish] = useState(null);
    const [editMessage, setEditMessage] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [dishToArchive, setDishToArchive] = useState(null);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveMessage, setArchiveMessage] = useState("");

    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [dishToRestore, setDishToRestore] = useState(null);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreMessage, setRestoreMessage] = useState("");

    const [qrLoadingId, setQrLoadingId] = useState(null);
    const [qrError, setQrError] = useState("");

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryMessage, setCategoryMessage] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate("/manager/login", { replace: true });
            return;
        }

        fetchCategories();
    }, []);

    useEffect(() => {
        if (token) fetchDishes();
    }, [search, category, view]);

    // FETCH CATEGORIES
    async function fetchCategories() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/manager/categories`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Could not load categories.");
            }

            const data = await response.json();
            setCategories(data);
        } catch (err) {
            setError(err.message);
        }
    }

    // FETCH DISHES
    async function fetchDishes() {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();

            if (search.trim()) {
                params.set("search", search.trim());
            }

            if (category !== "All") {
                params.set("category", category);
            }

            if (view === "archived") {
                params.set("archived", "true");
            }

            const response = await fetch(
                `${API_BASE_URL}/api/manager/dishes?${params}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Could not load dishes.");
            }

            const data = await response.json();
            setDishes(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // ADD DISH
    async function handleAddDish(e) {
        e.preventDefault();

        try {
            setSaving(true);
            setFormMessage("");
            setCreatedQR("");

            const response = await fetch(
                `${API_BASE_URL}/api/manager/dishes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...newDish,
                        price: Number(newDish.price)
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to add dish.");
            }

            setFormMessage("Dish added successfully!");
            setCreatedQR(data.dish.qrCode);
            setCreatedDishName(data.dish.name);

            setNewDish({
                name: "",
                price: "",
                description: "",
                category: "",
                image: ""
            });

            if (view === "active") await fetchDishes();
        } catch (err) {
            setFormMessage(err.message);
        } finally {
            setSaving(false);
        }
    }

    // ADD CATEGORY
    async function handleAddCategory(e) {
        e.preventDefault();

        try {
            setSavingCategory(true);
            setCategoryMessage("");

            const response = await fetch(
                `${API_BASE_URL}/api/manager/categories`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: newCategoryName.trim()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to add category.");
            }

            setNewCategoryName("");
            setCategoryMessage("Category added successfully!");

            await fetchCategories();
        } catch (err) {
            setCategoryMessage(err.message);
        } finally {
            setSavingCategory(false);
        }
    }

    // EDIT DISH
    async function handleEditDish(e) {
        e.preventDefault();

        try {
            setSavingEdit(true);
            setEditMessage("");

            const response = await fetch(
                `${API_BASE_URL}/api/manager/dishes/${editingDish.dishId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: editingDish.name,
                        price: Number(editingDish.price),
                        description: editingDish.description,
                        category: editingDish.category,
                        isAvailable: editingDish.isAvailable
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update dish.");
            }

            setEditingDish(null);
            await fetchDishes();
        } catch (err) {
            setEditMessage(err.message);
        } finally {
            setSavingEdit(false);
        }
    }

    function openEditModal(dish) {
        setEditingDish({
            ...dish,
            price: String(dish.price)
        });
        setEditMessage("");
    }

    // ARCHIVE DISH
    function openArchiveModal(dish) {
        setDishToArchive(dish);
        setArchiveMessage("");
        setShowArchiveModal(true);
    }

    async function handleArchiveDish() {
        if (!dishToArchive) return;

        try {
            setArchiveLoading(true);
            setArchiveMessage("");

            const response = await fetch(
                `${API_BASE_URL}/api/manager/dishes/${dishToArchive.dishId}/archive`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to archive dish.");
            }

            setShowArchiveModal(false);
            setDishToArchive(null);
            await fetchDishes();
        } catch (err) {
            setArchiveMessage(err.message);
        } finally {
            setArchiveLoading(false);
        }
    }

    // RESTORE DISH
    function openRestoreModal(dish) {
        setDishToRestore(dish);
        setRestoreMessage("");
        setShowRestoreModal(true);
    }

    async function handleRestoreDish() {
        if (!dishToRestore) return;

        try {
            setRestoreLoading(true);
            setRestoreMessage("");

            const response = await fetch(
                `${API_BASE_URL}/api/manager/dishes/${dishToRestore.dishId}/restore`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to restore dish.");
            }

            setShowRestoreModal(false);
            setDishToRestore(null);
            await fetchDishes();
        } catch (err) {
            setRestoreMessage(err.message);
        } finally {
            setRestoreLoading(false);
        }
    }

    // DOWNLOAD DISH QR
    async function handleDownloadQR(dish) {
        try {
            setQrLoadingId(dish.dishId);
            setQrError("");

            const response = await fetch(
                `${API_BASE_URL}/api/manager/dishes/${dish.dishId}/qr`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Could not fetch QR code.");
            }

            if (!data.qrCode) {
                throw new Error("QR code was not returned by the server.");
            }

            const link = document.createElement("a");
            link.href = data.qrCode;
            link.download = `${dish.name.replace(/[^a-z0-9]/gi, "-")}-qr.png`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            setQrError(err.message);
        } finally {
            setQrLoadingId(null);
        }
    }

    const activeCount = dishes.filter(dish => !dish.isArchived).length;

    return (
        <div className="dyn-dishes-page">
            <style>{`
                .dyn-dishes-page {
                    min-height: 100vh;
                    background: #11100F;
                    color: #F8F4EE;
                    font-family: Arial, sans-serif;
                    padding-bottom: 35px;
                }

                .dyn-dishes-page * {
                    box-sizing: border-box;
                }

                .dyn-dishes-header {
                    background: #1B1816;
                    border-bottom: 1px solid #38302B;
                    padding: 22px max(5%, calc((100% - 1250px) / 2));
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                    flex-wrap: wrap;
                }

                .dyn-brand {
                    color: #D28B6B;
                    font-size: 23px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    margin: 0;
                }

                .dyn-tagline {
                    color: #A99A8E;
                    font-size: 12px;
                    letter-spacing: 1.5px;
                    margin: 5px 0 0;
                }

                .dyn-back-btn {
                    background: #29231F;
                    color: #F8F4EE;
                    border: 1px solid #514239;
                    padding: 12px 17px;
                    border-radius: 9px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .dyn-back-btn:hover {
                    background: #3A302A;
                }

                .dyn-dishes-main {
                    max-width: 1250px;
                    margin: 0 auto;
                    padding: 38px 24px;
                }

                .dyn-page-heading {
                    font-size: 30px;
                    letter-spacing: -0.7px;
                    margin: 0;
                }

                .dyn-subtitle {
                    color: #A99A8E;
                    margin: 9px 0 28px;
                    font-size: 14px;
                }

                .dyn-top-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-bottom: 30px;
                }

                .dyn-btn {
                    padding: 12px 19px;
                    border-radius: 9px;
                    border: 1px solid transparent;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: 0.2s;
                }

                .dyn-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }

                .dyn-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .dyn-btn-primary {
                    background: #A65C43;
                    color: white;
                }

                .dyn-btn-secondary {
                    background: #263E37;
                    color: #C4E3D0;
                    border-color: #426456;
                }

                .dyn-view-tabs {
                    display: flex;
                    gap: 9px;
                    border-bottom: 1px solid #38302B;
                    margin-bottom: 22px;
                }

                .dyn-view-tab {
                    padding: 13px 18px;
                    border: none;
                    border-bottom: 3px solid transparent;
                    background: transparent;
                    color: #A99A8E;
                    font-weight: 800;
                    cursor: pointer;
                }

                .dyn-view-tab.active {
                    color: #E5A181;
                    border-bottom-color: #B96F50;
                }

                .dyn-toolbar {
                    display: grid;
                    grid-template-columns: minmax(220px, 1fr) minmax(190px, 260px);
                    gap: 12px;
                    margin-bottom: 24px;
                }

                .dyn-field {
                    width: 100%;
                    min-width: 0;
                    padding: 13px 14px;
                    border-radius: 9px;
                    border: 1px solid #494039;
                    background: #211D1A;
                    color: #F8F4EE;
                    font-size: 14px;
                    outline: none;
                }

                .dyn-field:focus {
                    border-color: #B96F50;
                    box-shadow: 0 0 0 3px rgba(185,111,80,0.14);
                }

                .dyn-field::placeholder {
                    color: #82766D;
                }

                .dyn-field option {
                    background: #211D1A;
                    color: #F8F4EE;
                }

                textarea.dyn-field {
                    min-height: 95px;
                    resize: vertical;
                    font-family: inherit;
                }

                .dyn-dish-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
                    gap: 18px;
                }

                .dyn-dish-card {
                    background: #211D1A;
                    border: 1px solid #39312B;
                    border-radius: 14px;
                    padding: 21px;
                    min-width: 0;
                    transition: transform 0.2s, border-color 0.2s;
                }

                .dyn-dish-card:hover {
                    transform: translateY(-3px);
                    border-color: #80513F;
                }

                .dyn-dish-topline {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 10px;
                }

                .dyn-dish-name {
                    font-size: 20px;
                    line-height: 1.3;
                    margin: 0;
                    overflow-wrap: anywhere;
                    color: #F8F4EE;
                }

                .dyn-dish-category {
                    color: #D28B6B;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    margin: 9px 0 12px;
                }

                .dyn-dish-description {
                    color: #A99A8E;
                    font-size: 13px;
                    line-height: 1.6;
                    min-height: 42px;
                    overflow-wrap: anywhere;
                }

                .dyn-dish-price {
                    color: #F0C3A7;
                    font-size: 23px;
                    font-weight: 900;
                    margin: 17px 0;
                }

                .dyn-availability {
                    display: inline-block;
                    padding: 6px 10px;
                    border-radius: 30px;
                    font-size: 11px;
                    font-weight: 800;
                    margin-bottom: 14px;
                }

                .dyn-available {
                    background: #203C2E;
                    color: #A8D5B5;
                }

                .dyn-unavailable {
                    background: #442827;
                    color: #F0A6A0;
                }

                .dyn-archived {
                    background: #3B3025;
                    color: #E6BE8A;
                }

                .dyn-card-actions {
                    display: flex;
                    gap: 9px;
                    margin-top: 14px;
                }

                .dyn-card-actions button {
                    flex: 1;
                }

                .dyn-small-btn {
                    padding: 10px 12px;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .dyn-edit-btn {
                    background: #49352B;
                    border-color: #80513F;
                    color: #F0C3A7;
                }

                .dyn-archive-btn {
                    background: #402725;
                    border-color: #70413B;
                    color: #F1B0A8;
                }

                .dyn-restore-btn {
                    background: #203C2E;
                    border-color: #426456;
                    color: #B7E1C4;
                }

                .dyn-qr-btn {
                    width: 100%;
                    background: #302923;
                    border: 1px solid #514239;
                    color: #E8D9CB;
                    padding: 11px;
                    border-radius: 8px;
                    font-weight: 800;
                    font-size: 12px;
                    cursor: pointer;
                }

                .dyn-qr-btn:hover {
                    background: #40352D;
                }

                .dyn-empty {
                    padding: 65px 20px;
                    text-align: center;
                    background: #1C1917;
                    border: 1px dashed #514239;
                    border-radius: 14px;
                    color: #A99A8E;
                }

                .dyn-empty-icon {
                    font-size: 38px;
                    margin-bottom: 12px;
                }

                .dyn-empty h3 {
                    color: #F8F4EE;
                    margin: 0 0 8px;
                }

                .dyn-message {
                    padding: 12px 15px;
                    border-radius: 9px;
                    margin: 12px 0;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .dyn-error {
                    background: #3D2422;
                    border: 1px solid #70413B;
                    color: #F3B0A8;
                }

                .dyn-success {
                    background: #20382B;
                    border: 1px solid #426456;
                    color: #B7E1C4;
                }

                .dyn-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 2000;
                    background: rgba(0,0,0,0.78);
                    backdrop-filter: blur(5px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 18px;
                }

                .dyn-modal {
                    position: relative;
                    width: 100%;
                    max-width: 510px;
                    max-height: 90vh;
                    overflow-y: auto;
                    background: #211D1A;
                    border: 1px solid #554238;
                    border-radius: 17px;
                    padding: 27px;
                    box-shadow: 0 25px 80px rgba(0,0,0,0.5);
                    color: #F8F4EE;
                }

                .dyn-modal-heading {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .dyn-modal-heading h2 {
                    margin: 0;
                    font-size: 23px;
                }

                .dyn-close-btn {
                    width: 34px;
                    height: 34px;
                    flex-shrink: 0;
                    border: 1px solid #514239;
                    border-radius: 50%;
                    background: #302923;
                    color: #E8D9CB;
                    font-size: 23px;
                    cursor: pointer;
                    line-height: 1;
                }

                .dyn-form {
                    display: flex;
                    flex-direction: column;
                    gap: 13px;
                }

                .dyn-form label {
                    color: #D7C5B7;
                    font-size: 12px;
                    font-weight: 800;
                    margin-top: 4px;
                }

                .dyn-save-btn {
                    width: 100%;
                    background: #A65C43;
                    color: white;
                    border: none;
                    border-radius: 9px;
                    padding: 14px;
                    font-size: 14px;
                    font-weight: 900;
                    cursor: pointer;
                    margin-top: 7px;
                }

                .dyn-save-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .dyn-qr-preview {
                    margin-top: 20px;
                    padding: 20px;
                    border-radius: 12px;
                    background: #F8F4EE;
                    color: #33251F;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    text-align: center;
                }

                .dyn-qr-preview h3 {
                    margin: 0;
                }

                .dyn-qr-preview img {
                    max-width: 180px;
                    height: auto;
                }

                .dyn-download-link {
                    background: #49362D;
                    color: white;
                    padding: 11px 17px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 800;
                }

                .dyn-modal-copy {
                    color: #B9A99D;
                    font-size: 14px;
                    line-height: 1.6;
                }

                .dyn-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 22px;
                }

                .dyn-cancel-btn,
                .dyn-confirm-btn {
                    padding: 11px 17px;
                    border-radius: 8px;
                    border: none;
                    font-weight: 800;
                    cursor: pointer;
                }

                .dyn-cancel-btn {
                    background: #39312B;
                    color: #E8D9CB;
                }

                .dyn-confirm-btn {
                    background: #A65C43;
                    color: white;
                }

                .dyn-footer {
                    text-align: center;
                    padding: 28px 15px;
                    color: #74685F;
                    font-size: 11px;
                    letter-spacing: 1.5px;
                }

                @media (max-width: 650px) {
                    .dyn-dishes-main {
                        padding: 27px 16px;
                    }

                    .dyn-dishes-header {
                        padding: 18px 16px;
                    }

                    .dyn-page-heading {
                        font-size: 25px;
                    }

                    .dyn-toolbar {
                        grid-template-columns: 1fr;
                    }

                    .dyn-dish-grid {
                        grid-template-columns: 1fr;
                    }

                    .dyn-modal {
                        padding: 21px;
                    }

                    .dyn-modal-actions {
                        flex-direction: column-reverse;
                    }

                    .dyn-modal-actions button {
                        width: 100%;
                    }
                }
            `}</style>

            {/* HEADER */}
            {/* <header className="dyn-dishes-header">
                {/* <div>
                    <h1 className="dyn-brand">DYNFLW</h1>
                    <p className="dyn-tagline">DINING, IN SYNC.</p>
                </div> */}

                {/* <button
                    className="dyn-back-btn"
                    onClick={() => navigate("/manager")}
                >
                    ← Back to Dashboard
                </button> */}
            {/* </header> */} 

            <main className="dyn-dishes-main">
                <h2 className="dyn-page-heading">Dish Management</h2>

                <p className="dyn-subtitle">
                    Manage your restaurant menu, categories and dish availability.
                </p>

                {/* TOP ACTIONS */}
                <div className="dyn-top-actions">
                    <button
                        className="dyn-btn dyn-btn-primary"
                        onClick={() => {
                            setShowForm(true);
                            setCreatedQR("");
                            setCreatedDishName("");
                            setFormMessage("");
                        }}
                    >
                        + Add New Dish
                    </button>

                    <button
                        className="dyn-btn dyn-btn-secondary"
                        onClick={() => {
                            setShowCategoryModal(true);
                            setCategoryMessage("");
                        }}
                    >
                        + Add Category
                    </button>
                </div>

                {/* ACTIVE / ARCHIVED TABS */}
                <div className="dyn-view-tabs">
                    <button
                        className={`dyn-view-tab ${view === "active" ? "active" : ""}`}
                        onClick={() => setView("active")}
                    >
                        Active Dishes
                    </button>

                    <button
                        className={`dyn-view-tab ${view === "archived" ? "active" : ""}`}
                        onClick={() => setView("archived")}
                    >
                        Archived Dishes
                    </button>
                </div>

                {/* SEARCH AND FILTER */}
                <div className="dyn-toolbar">
                    <input
                        className="dyn-field"
                        type="text"
                        placeholder="Search dishes by name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />

                    <select
                        className="dyn-field"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {categories.map(item => (
                            <option key={item._id} value={item.name}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="dyn-message dyn-error">{error}</div>
                )}

                {qrError && (
                    <div className="dyn-message dyn-error">{qrError}</div>
                )}

                {/* DISH LIST */}
                {loading ? (
                    <div className="dyn-empty">
                        Loading your menu...
                    </div>
                ) : dishes.length === 0 ? (
                    <div className="dyn-empty">
                        <div className="dyn-empty-icon">🍽️</div>
                        <h3>
                            {view === "archived"
                                ? "No archived dishes"
                                : "Your menu is waiting"}
                        </h3>
                        <p>
                            {view === "archived"
                                ? "Archived dishes will appear here."
                                : "Add your first dish to start building your menu."}
                        </p>
                    </div>
                ) : (
                    <div className="dyn-dish-grid">
                        {dishes.map(dish => (
                            <article
                                key={dish._id}
                                className="dyn-dish-card"
                            >
                                <div className="dyn-dish-topline">
                                    <h3 className="dyn-dish-name">
                                        {dish.name}
                                    </h3>
                                </div>

                                <p className="dyn-dish-category">
                                    {dish.category}
                                </p>

                                <p className="dyn-dish-description">
                                    {dish.description || "No description added."}
                                </p>

                                <div className="dyn-dish-price">
                                    ₹{Number(dish.price).toFixed(2)}
                                </div>

                                <button
                                    type="button"
                                    className="dyn-qr-btn"
                                    disabled={qrLoadingId === dish.dishId}
                                    onClick={() => handleDownloadQR(dish)}
                                >
                                    {qrLoadingId === dish.dishId
                                        ? "Preparing QR..."
                                        : "↓ Download Dish QR Code"}
                                </button>

                                {view === "active" ? (
                                    <>
                                        <div>
                                            <span className={`dyn-availability ${
                                                dish.isAvailable
                                                    ? "dyn-available"
                                                    : "dyn-unavailable"
                                            }`}>
                                                {dish.isAvailable
                                                    ? "● AVAILABLE"
                                                    : "● UNAVAILABLE"}
                                            </span>
                                        </div>

                                        <div className="dyn-card-actions">
                                            <button
                                                type="button"
                                                className="dyn-small-btn dyn-edit-btn"
                                                onClick={() => openEditModal(dish)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="dyn-small-btn dyn-archive-btn"
                                                onClick={() => openArchiveModal(dish)}
                                            >
                                                Archive
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <span className="dyn-availability dyn-archived">
                                                ARCHIVED
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="dyn-small-btn dyn-restore-btn"
                                            style={{ width: "100%" }}
                                            onClick={() => openRestoreModal(dish)}
                                        >
                                            Restore Dish
                                        </button>
                                    </>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </main>

            {/* ADD CATEGORY MODAL */}
            {showCategoryModal && (
                <Modal
                    title="Add New Category"
                    onClose={() => setShowCategoryModal(false)}
                >
                    <form onSubmit={handleAddCategory} className="dyn-form">
                        <label>Category name</label>
                        <input
                            className="dyn-field"
                            type="text"
                            placeholder="e.g. Desserts"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            required
                        />

                        <button
                            type="submit"
                            className="dyn-save-btn"
                            disabled={savingCategory}
                        >
                            {savingCategory ? "Adding..." : "Create Category"}
                        </button>
                    </form>

                    {categoryMessage && (
                        <div className={`dyn-message ${
                            categoryMessage.includes("successfully")
                                ? "dyn-success"
                                : "dyn-error"
                        }`}>
                            {categoryMessage}
                        </div>
                    )}
                </Modal>
            )}

            {/* ADD DISH MODAL */}
            {showForm && (
                <Modal
                    title="Add New Dish"
                    onClose={() => {
                        setShowForm(false);
                        setCreatedQR("");
                        setFormMessage("");
                    }}
                >
                    <form onSubmit={handleAddDish} className="dyn-form">
                        <label>Dish name</label>
                        <input
                            className="dyn-field"
                            placeholder="Enter dish name"
                            value={newDish.name}
                            onChange={e => setNewDish({
                                ...newDish,
                                name: e.target.value
                            })}
                            required
                        />

                        <label>Price (₹)</label>
                        <input
                            className="dyn-field"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter price"
                            value={newDish.price}
                            onChange={e => setNewDish({
                                ...newDish,
                                price: e.target.value
                            })}
                            required
                        />

                        <label>Description</label>
                        <textarea
                            className="dyn-field"
                            placeholder="Describe the dish..."
                            value={newDish.description}
                            onChange={e => setNewDish({
                                ...newDish,
                                description: e.target.value
                            })}
                        />

                        <label>Category</label>
                        <select
                            className="dyn-field"
                            value={newDish.category}
                            onChange={e => setNewDish({
                                ...newDish,
                                category: e.target.value
                            })}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(item => (
                                <option key={item._id} value={item.name}>
                                    {item.name}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="dyn-save-btn"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Dish"}
                        </button>
                    </form>

                    {formMessage && (
                        <div className={`dyn-message ${
                            formMessage.includes("successfully")
                                ? "dyn-success"
                                : "dyn-error"
                        }`}>
                            {formMessage}
                        </div>
                    )}

                    {createdQR && (
                        <div className="dyn-qr-preview">
                            <h3>Dish QR Code Generated!</h3>
                            <p>{createdDishName}</p>

                            <img
                                src={createdQR}
                                alt="New dish QR code"
                            />

                            <a
                                href={createdQR}
                                download={`${createdDishName || "dish"}-qr.png`}
                                className="dyn-download-link"
                            >
                                Download QR Code
                            </a>
                        </div>
                    )}
                </Modal>
            )}

            {/* EDIT DISH MODAL */}
            {editingDish && (
                <Modal
                    title="Edit Dish"
                    onClose={() => setEditingDish(null)}
                >
                    <form onSubmit={handleEditDish} className="dyn-form">
                        <label>Dish name</label>
                        <input
                            className="dyn-field"
                            value={editingDish.name}
                            onChange={e => setEditingDish({
                                ...editingDish,
                                name: e.target.value
                            })}
                            required
                        />

                        <label>Price (₹)</label>
                        <input
                            className="dyn-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingDish.price}
                            onChange={e => setEditingDish({
                                ...editingDish,
                                price: e.target.value
                            })}
                            required
                        />

                        <label>Description</label>
                        <textarea
                            className="dyn-field"
                            value={editingDish.description || ""}
                            onChange={e => setEditingDish({
                                ...editingDish,
                                description: e.target.value
                            })}
                        />

                        <label>Category</label>
                        <select
                            className="dyn-field"
                            value={editingDish.category}
                            onChange={e => setEditingDish({
                                ...editingDish,
                                category: e.target.value
                            })}
                            required
                        >
                            {categories.map(item => (
                                <option key={item._id} value={item.name}>
                                    {item.name}
                                </option>
                            ))}
                        </select>

                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10
                        }}>
                            <input
                                type="checkbox"
                                checked={editingDish.isAvailable ?? true}
                                onChange={e => setEditingDish({
                                    ...editingDish,
                                    isAvailable: e.target.checked
                                })}
                            />
                            Available for ordering
                        </label>

                        <button
                            type="submit"
                            className="dyn-save-btn"
                            disabled={savingEdit}
                        >
                            {savingEdit ? "Saving Changes..." : "Save Changes"}
                        </button>
                    </form>

                    {editMessage && (
                        <div className="dyn-message dyn-error">
                            {editMessage}
                        </div>
                    )}
                </Modal>
            )}

            {/* ARCHIVE CONFIRMATION */}
            {showArchiveModal && (
                <Modal
                    title="Archive Dish?"
                    onClose={() => {
                        setShowArchiveModal(false);
                        setDishToArchive(null);
                        setArchiveMessage("");
                    }}
                >
                    <p className="dyn-modal-copy">
                        Are you sure you want to archive{" "}
                        <strong>{dishToArchive?.name}</strong>?
                    </p>

                    <p className="dyn-modal-copy">
                        The dish will disappear from the active menu.
                        Its record and QR code will be preserved.
                    </p>

                    {archiveMessage && (
                        <div className="dyn-message dyn-error">
                            {archiveMessage}
                        </div>
                    )}

                    <div className="dyn-modal-actions">
                        <button
                            className="dyn-cancel-btn"
                            onClick={() => {
                                setShowArchiveModal(false);
                                setDishToArchive(null);
                            }}
                            disabled={archiveLoading}
                        >
                            Cancel
                        </button>

                        <button
                            className="dyn-confirm-btn"
                            onClick={handleArchiveDish}
                            disabled={archiveLoading}
                        >
                            {archiveLoading ? "Archiving..." : "Yes, Archive"}
                        </button>
                    </div>
                </Modal>
            )}

            {/* RESTORE CONFIRMATION */}
            {showRestoreModal && (
                <Modal
                    title="Restore Dish?"
                    onClose={() => {
                        setShowRestoreModal(false);
                        setDishToRestore(null);
                        setRestoreMessage("");
                    }}
                >
                    <p className="dyn-modal-copy">
                        Do you want to restore{" "}
                        <strong>{dishToRestore?.name}</strong>?
                    </p>

                    <p className="dyn-modal-copy">
                        This dish will return to your active menu.
                    </p>

                    {restoreMessage && (
                        <div className="dyn-message dyn-error">
                            {restoreMessage}
                        </div>
                    )}

                    <div className="dyn-modal-actions">
                        <button
                            className="dyn-cancel-btn"
                            onClick={() => {
                                setShowRestoreModal(false);
                                setDishToRestore(null);
                            }}
                            disabled={restoreLoading}
                        >
                            Cancel
                        </button>

                        <button
                            className="dyn-confirm-btn"
                            onClick={handleRestoreDish}
                            disabled={restoreLoading}
                        >
                            {restoreLoading ? "Restoring..." : "Yes, Restore"}
                        </button>
                    </div>
                </Modal>
            )}

            <footer className="dyn-footer">
                POWERED BY DYNFLW · DINING, IN SYNC.
            </footer>
        </div>
    );
}

// REUSABLE MODAL
function Modal({ title, children, onClose }) {
    return (
        <div
            className="dyn-modal-overlay"
            onClick={onClose}
        >
            <div
                className="dyn-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="dyn-modal-heading">
                    <h2>{title}</h2>

                    <button
                        type="button"
                        className="dyn-close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}

export default ManagerDishes;
