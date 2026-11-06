
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import API_BASE_URL from "../config/api";

function ManagerTable() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [view, setView] = useState("active");
    const [selectedTable, setSelectedTable] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const [tableNumber, setTableNumber] = useState("");
    const [capacity, setCapacity] = useState("4");
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem("managerToken");

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    async function request(url, options = {}) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    }

    // FETCH TABLES
    async function fetchTables() {
        try {
            setLoading(true);

            const data = await request("/api/manager/tables");

            setTables(data.tables || []);
            setError("");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchTables();
    }, []);

    // REAL-TIME TABLE UPDATES
    useEffect(() => {
        const socket = io(API_BASE_URL);

        socket.on("table-status-updated", updatedTable => {
            setTables(previousTables => {
                if (
                    updatedTable.action === "deleted" ||
                    updatedTable.isDeleted
                ) {
                    return previousTables.filter(
                        table => table.tableId !== updatedTable.tableId
                    );
                }

                if (updatedTable.action === "created") {
                    const alreadyExists = previousTables.some(
                        table => table.tableId === updatedTable.tableId
                    );

                    if (alreadyExists) {
                        return previousTables.map(table =>
                            table.tableId === updatedTable.tableId
                                ? { ...table, ...updatedTable }
                                : table
                        );
                    }

                    return [...previousTables, updatedTable].sort(
                        (a, b) => a.tableNumber - b.tableNumber
                    );
                }

                return previousTables.map(table =>
                    table.tableId === updatedTable.tableId
                        ? { ...table, ...updatedTable }
                        : table
                );
            });

            setSelectedTable(previousSelected => {
                if (
                    !previousSelected ||
                    previousSelected.tableId !== updatedTable.tableId
                ) {
                    return previousSelected;
                }

                if (
                    updatedTable.action === "deleted" ||
                    updatedTable.isDeleted
                ) {
                    return null;
                }

                return {
                    ...previousSelected,
                    ...updatedTable
                };
            });
        });

        return () => {
            socket.off("table-status-updated");
            socket.disconnect();
        };
    }, []);

    // ADD TABLE
    async function addTable(e) {
        e.preventDefault();

        try {
            setSaving(true);
            setError("");

            await request("/api/manager/tables", {
                method: "POST",
                body: JSON.stringify({
                    tableNumber: Number(tableNumber),
                    capacity: Number(capacity)
                })
            });

            setShowAddModal(false);
            setTableNumber("");
            setCapacity("4");
            setMessage("Table added successfully.");

            await fetchTables();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    // SAVE TABLE
    async function saveTable(e) {
        e.preventDefault();

        try {
            setSaving(true);
            setError("");

            await request(
                `/api/manager/tables/${selectedTable.tableId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        tableNumber: Number(selectedTable.tableNumber),
                        capacity: Number(selectedTable.capacity),
                        status: selectedTable.status
                    })
                }
            );

            setSelectedTable(null);
            setMessage("Table details updated successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    // DOWNLOAD QR CODE
    async function downloadQR(table) {
        try {
            const data = await request(
                `/api/manager/tables/${table.tableId}/qr`
            );

            const link = document.createElement("a");

            link.href = data.qrCode;
            link.download = `DynFlw-Table-${table.tableNumber}-QR.png`;

            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError(err.message);
        }
    }

    // ARCHIVE TABLE
    async function archiveTable(table) {
        if (table.status === "occupied") {
            setError("An occupied table cannot be archived.");
            return;
        }

        if (!window.confirm(`Archive Table ${table.tableNumber}?`)) {
            return;
        }

        await performAction(
            `/api/manager/tables/${table.tableId}/archive`,
            "PATCH",
            "Table archived successfully."
        );
    }

    // RESTORE TABLE
    async function restoreTable(table) {
        await performAction(
            `/api/manager/tables/${table.tableId}/restore`,
            "PATCH",
            "Table restored successfully."
        );
    }

    // DELETE TABLE
    async function removeTable(table) {
        if (!window.confirm(
            `Permanently remove Table ${table.tableNumber}? This cannot be undone.`
        )) {
            return;
        }

        await performAction(
            `/api/manager/tables/${table.tableId}`,
            "DELETE",
            "Table removed successfully."
        );
    }

    // COMMON ACTION HANDLER
    async function performAction(url, method, successMessage) {
        try {
            setError("");

            await request(url, { method });

            setMessage(successMessage);
            setSelectedTable(null);
        } catch (err) {
            setError(err.message);
        }
    }

    // FILTER TABLES
    const activeTables = tables
        .filter(table => table.isActive)
        .sort((a, b) => a.tableNumber - b.tableNumber);

    const archivedTables = tables
        .filter(table => !table.isActive)
        .sort((a, b) => a.tableNumber - b.tableNumber);

    const displayedTables =
        view === "active" ? activeTables : archivedTables;

    // STATUS STYLES
    const statusColors = {
        available: {
            background: "#E7F1E8",
            border: "#B9D1BB",
            color: "#416B49",
            label: "AVAILABLE"
        },
        occupied: {
            background: "#F9E9E3",
            border: "#E5BEB0",
            color: "#A34F3D",
            label: "OCCUPIED"
        },
        disabled: {
            background: "#EEEAE5",
            border: "#D6CEC5",
            color: "#766B62",
            label: "DISABLED"
        }
    };

    if (loading) {
        return (
            <div className="table-loading">
                <div className="table-loader" />
                <h2>Loading your tables...</h2>
            </div>
        );
    }

    return (
        <div className="manager-tables-page">
            <style>{`
                .manager-tables-page {
                    min-height: 100vh;
                    padding: 32px;
                    background: #11100F;
                    color: #F8F4EE;
                    font-family: Arial, sans-serif;
                    box-sizing: border-box;
                }

                .manager-tables-page * {
                    box-sizing: border-box;
                }

                .tables-header {
                    max-width: 1400px;
                    margin: 0 auto 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 18px;
                }

                .tables-eyebrow {
                    color: #A65C43;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 2.5px;
                    margin-bottom: 9px;
                }

                .tables-header h1 {
                    font-size: 32px;
                    margin: 0;
                    letter-spacing: -1px;
                    color: #33251F;
                }

                .tables-header p {
                    color: #8C7C70;
                    margin: 8px 0 0;
                    font-size: 14px;
                }

                .tables-add-btn {
                    border: none;
                    border-radius: 10px;
                    padding: 14px 21px;
                    background: #A65C43;
                    color: white;
                    font-weight: 800;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.2s;
                }

                .tables-add-btn:hover {
                    background: #8D4934;
                    transform: translateY(-2px);
                }

                .tables-content {
                    max-width: 1400px;
                    margin: auto;
                }

                .tables-message {
                    padding: 13px 16px;
                    margin-bottom: 18px;
                    border-radius: 9px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .tables-error {
                    background: #FCE9E5;
                    color: #A33A32;
                    border: 1px solid #E8B9AF;
                }

                .tables-success {
                    background: #E7F1E8;
                    color: #416B49;
                    border: 1px solid #B9D1BB;
                }

                .tables-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 25px;
                    border-bottom: 1px solid #E5D9CE;
                    padding-bottom: 12px;
                }

                .tables-tab {
                    padding: 11px 17px;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    background: transparent;
                    color: #827469;
                    font-size: 13px;
                    font-weight: 800;
                    cursor: pointer;
                }

                .tables-tab.active {
                    background: #49362D;
                    color: #fff;
                }

                .tables-grid {
                    display: grid;
                    grid-template-columns: repeat(
                        auto-fill,
                        minmax(190px, 1fr)
                    );
                    gap: 19px;
                }

                .table-card {
                    min-height: 220px;
                    border-radius: 15px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .table-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 9px 24px rgba(65, 43, 30, 0.12);
                }

                .table-card-icon {
                    font-size: 34px;
                    margin-bottom: 6px;
                }

                .table-card h2 {
                    margin: 5px 0;
                    font-size: 23px;
                    color: #33251F;
                }

                .table-card p {
                    margin: 5px 0 14px;
                    color: #766B62;
                    font-size: 13px;
                }

                .table-card-status {
                    border-radius: 30px;
                    padding: 7px 13px;
                    color: white;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 0.8px;
                }

                .table-card-hint {
                    margin-top: 14px;
                    font-size: 11px;
                    color: #887A70;
                }

                .tables-empty {
                    text-align: center;
                    padding: 75px 20px;
                    background: #fff;
                    border: 1px solid #E9DED3;
                    border-radius: 15px;
                }

                .tables-empty-icon {
                    font-size: 42px;
                    margin-bottom: 12px;
                }

                .tables-empty h2 {
                    margin: 0 0 10px;
                    color: #49362D;
                }

                .tables-empty p {
                    color: #92847A;
                    font-size: 14px;
                }

                /* MODAL */

                .table-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background: rgba(0, 0, 0, 0.78);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: tableFadeIn 0.18s ease;
                }

                .table-modal {
                    position: relative;
                    width: 100%;
                    max-width: 650px;
                    max-height: 92vh;
                    overflow-y: auto;
                    background: #FCF9F5;
                    border: 1px solid rgba(255,255,255,0.5);
                    border-radius: 22px;
                    box-shadow: 0 25px 80px rgba(0,0,0,0.28);
                    animation: tableModalIn 0.22s ease;
                }

                .table-modal-header {
                    padding: 30px 34px 24px;
                    border-bottom: 1px solid #EAE0D6;
                    background: #F5EDE4;
                }

                .table-modal-eyebrow {
                    color: #A65C43;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    margin-bottom: 9px;
                }

                .table-modal-title {
                    color: #392920;
                    font-size: 27px;
                    font-weight: 900;
                    letter-spacing: -0.7px;
                    margin: 0;
                }

                .table-modal-subtitle {
                    margin: 8px 0 0;
                    color: #89786C;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .table-modal-close {
                    position: absolute;
                    top: 22px;
                    right: 25px;
                    width: 38px;
                    height: 38px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: 1px solid #E2D5C9;
                    border-radius: 50%;
                    background: #FFFCF8;
                    color: #5B4538;
                    font-size: 23px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .table-modal-close:hover {
                    background: #EDE1D6;
                }

                .table-modal-body {
                    padding: 28px 34px 32px;
                }

                .table-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 19px;
                }

                .table-field {
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                    min-width: 0;
                }

                .table-field.full {
                    grid-column: 1 / -1;
                }

                .table-field label {
                    color: #574237;
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: 0.3px;
                }

                .table-field input,
                .table-field select {
                    width: 100%;
                    min-height: 51px;
                    padding: 13px 15px;
                    border: 1px solid #DED2C6;
                    border-radius: 9px;
                    background: #FFFFFF;
                    color: #38271F;
                    font-size: 15px;
                    font-weight: 600;
                    outline: none;
                    transition: border 0.2s, box-shadow 0.2s;
                }

                .table-field input:focus,
                .table-field select:focus {
                    border-color: #A65C43;
                    box-shadow: 0 0 0 3px rgba(166, 92, 67, 0.12);
                }

                .table-modal-divider {
                    height: 1px;
                    background: #EAE0D6;
                    margin: 26px 0 22px;
                }

                .table-modal-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 11px;
                }

                .table-modal-btn {
                    min-height: 49px;
                    padding: 13px 17px;
                    border-radius: 9px;
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: transform 0.15s, background 0.15s;
                }

                .table-modal-btn:hover {
                    transform: translateY(-1px);
                }

                .table-modal-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .table-btn-primary {
                    width: 100%;
                    border: none;
                    background: #A65C43;
                    color: #fff;
                }

                .table-btn-primary:hover {
                    background: #8D4934;
                }

                .table-btn-qr {
                    width: 100%;
                    border: 1px solid #CBB9A9;
                    background: #FFFFFF;
                    color: #49362D;
                }

                .table-btn-qr:hover {
                    background: #F4ECE4;
                }

                .table-modal-bottom-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 11px;
                    margin-top: 4px;
                }

                .table-btn-archive {
                    border: 1px solid #D8C9BB;
                    background: #F2ECE5;
                    color: #665448;
                }

                .table-btn-archive:hover {
                    background: #E8DED3;
                }

                .table-btn-remove {
                    border: 1px solid #E4BDB7;
                    background: #FFF7F5;
                    color: #B33D35;
                }

                .table-btn-remove:hover {
                    background: #FCE9E5;
                }

                .table-loading {
                    min-height: 70vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 15px;
                    color: #49362D;
                    font-family: Arial, sans-serif;
                }

                .table-loader {
                    width: 38px;
                    height: 38px;
                    border: 4px solid #E9DED3;
                    border-top-color: #A65C43;
                    border-radius: 50%;
                    animation: tableSpin 0.8s linear infinite;
                }

                @keyframes tableSpin {
                    to { transform: rotate(360deg); }
                }

                @keyframes tableFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes tableModalIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @media (max-width: 650px) {
                    .manager-tables-page {
                        padding: 20px 13px;
                    }

                    .tables-header h1 {
                        font-size: 27px;
                    }

                    .tables-add-btn {
                        width: 100%;
                    }

                    .table-modal-overlay {
                        padding: 12px;
                        align-items: center;
                    }

                    .table-modal {
                        max-height: 94vh;
                        border-radius: 17px;
                    }

                    .table-modal-header {
                        padding: 25px 22px 20px;
                    }

                    .table-modal-body {
                        padding: 23px 22px 25px;
                    }

                    .table-modal-title {
                        font-size: 23px;
                    }

                    .table-modal-close {
                        top: 17px;
                        right: 17px;
                    }
                }

                @media (max-width: 430px) {
                    .table-form-grid {
                        grid-template-columns: 1fr;
                    }

                    .table-field.full {
                        grid-column: auto;
                    }

                    .table-modal-bottom-actions {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            {/* HEADER */}
            <header className="tables-header">
                <div>
                    {/* <div className="tables-eyebrow">
                        DYNFLW · RESTAURANT MANAGEMENT
                    </div> */}

                    <h1 style={{color: "white"}}>Table Management</h1>

                    {/* <p>
                        Manage your restaurant tables and seating arrangements.
                    </p> */}
                </div>

                <button
                    type="button"
                    className="tables-add-btn"
                    onClick={() => {
                        setError("");
                        setMessage("");
                        setShowAddModal(true);
                    }}
                >
                    + Add Table
                </button>
            </header>

            <main className="tables-content">
                {error && (
                    <div className="tables-message tables-error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="tables-message tables-success">
                        {message}
                    </div>
                )}

                {/* TABLE TABS */}
                <div className="tables-tabs">
                    <button
                        className={`tables-tab ${
                            view === "active" ? "active" : ""
                        }`}
                        onClick={() => setView("active")}
                    >
                        Active Tables ({activeTables.length})
                    </button>

                    <button
                        className={`tables-tab ${
                            view === "archived" ? "active" : ""
                        }`}
                        onClick={() => setView("archived")}
                    >
                        Archived ({archivedTables.length})
                    </button>
                </div>

                {/* TABLE GRID */}
                {displayedTables.length === 0 ? (
                    <div className="tables-empty">
                        <div className="tables-empty-icon">▦</div>

                        <h2>
                            No {view} tables found.
                        </h2>

                        <p>
                            {view === "active"
                                ? "Add your first restaurant table."
                                : "Archived tables will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="tables-grid">
                        {displayedTables.map(table => {
                            const colors =
                                statusColors[table.status] ||
                                statusColors.disabled;

                            return (
                                <button
                                    type="button"
                                    key={table.tableId}
                                    className="table-card"
                                    onClick={() => {
                                        setError("");
                                        setMessage("");
                                        setSelectedTable({ ...table });
                                    }}
                                    style={{
                                        background: colors.background,
                                        border: `1px solid ${colors.border}`
                                    }}
                                >
                                    <span className="table-card-icon">
                                        ▦
                                    </span>

                                    <h2>
                                        Table {table.tableNumber}
                                    </h2>

                                    <p>
                                        Capacity: {table.capacity}
                                    </p>

                                    <span
                                        className="table-card-status"
                                        style={{
                                            background: colors.border,
                                            color: colors.color
                                        }}
                                    >
                                        {colors.label}
                                    </span>

                                    <span className="table-card-hint">
                                        Click to manage
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ADD TABLE MODAL */}
            {showAddModal && (
                <Modal
                    eyebrow="TABLE MANAGEMENT"
                    title="Add New Table"
                    subtitle="Create a new table for your restaurant."
                    onClose={() => setShowAddModal(false)}
                >
                    <form onSubmit={addTable}>
                        <div className="table-form-grid">
                            <div className="table-field">
                                <label htmlFor="new-table-number">
                                    Table Number
                                </label>

                                <input
                                    id="new-table-number"
                                    type="number"
                                    min="1"
                                    required
                                    placeholder="e.g. 5"
                                    value={tableNumber}
                                    onChange={e =>
                                        setTableNumber(e.target.value)
                                    }
                                />
                            </div>

                            <div className="table-field">
                                <label htmlFor="new-table-capacity">
                                    Seating Capacity
                                </label>

                                <input
                                    id="new-table-capacity"
                                    type="number"
                                    min="1"
                                    required
                                    value={capacity}
                                    onChange={e =>
                                        setCapacity(e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="table-modal-divider" />

                        <button
                            type="submit"
                            disabled={saving}
                            className="table-modal-btn table-btn-primary"
                        >
                            {saving ? "Creating Table..." : "Create Table"}
                        </button>
                    </form>
                </Modal>
            )}

            {/* EDIT TABLE MODAL */}
            {selectedTable && (
                <Modal
                    eyebrow="TABLE MANAGEMENT"
                    title={`Edit Table ${selectedTable.tableNumber}`}
                    subtitle="Update table details and manage its availability."
                    onClose={() => setSelectedTable(null)}
                >
                    <form onSubmit={saveTable}>
                        <div className="table-form-grid">
                            <div className="table-field">
                                <label htmlFor="edit-table-number">
                                    Table Number
                                </label>

                                <input
                                    id="edit-table-number"
                                    type="number"
                                    min="1"
                                    required
                                    value={selectedTable.tableNumber}
                                    onChange={e =>
                                        setSelectedTable({
                                            ...selectedTable,
                                            tableNumber: e.target.value
                                        })
                                    }
                                />
                            </div>

                            <div className="table-field">
                                <label htmlFor="edit-table-capacity">
                                    Seating Capacity
                                </label>

                                <input
                                    id="edit-table-capacity"
                                    type="number"
                                    min="1"
                                    required
                                    value={selectedTable.capacity}
                                    onChange={e =>
                                        setSelectedTable({
                                            ...selectedTable,
                                            capacity: e.target.value
                                        })
                                    }
                                />
                            </div>

                            <div className="table-field full">
                                <label htmlFor="edit-table-status">
                                    Table Status
                                </label>

                                <select
                                    id="edit-table-status"
                                    value={selectedTable.status}
                                    onChange={e =>
                                        setSelectedTable({
                                            ...selectedTable,
                                            status: e.target.value
                                        })
                                    }
                                >
                                    <option value="available">
                                        Available
                                    </option>

                                    <option value="occupied">
                                        Occupied
                                    </option>

                                    <option value="disabled">
                                        Disabled
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="table-modal-divider" />

                        <div className="table-modal-actions">
                            <button
                                type="submit"
                                disabled={saving}
                                className="table-modal-btn table-btn-primary"
                            >
                                {saving ? "Saving Changes..." : "Save Changes"}
                            </button>
                        </div>
                    </form>

                    <div className="table-modal-actions" style={{ marginTop: 11 }}>
                        <button
                            type="button"
                            className="table-modal-btn table-btn-qr"
                            onClick={() => downloadQR(selectedTable)}
                        >
                            ▦ &nbsp; Download Table QR Code
                        </button>

                        <div className="table-modal-bottom-actions">
                            {view === "active" ? (
                                <button
                                    type="button"
                                    className="table-modal-btn table-btn-archive"
                                    onClick={() => archiveTable(selectedTable)}
                                >
                                    Archive Table
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="table-modal-btn table-btn-archive"
                                    onClick={() => restoreTable(selectedTable)}
                                >
                                    Restore Table
                                </button>
                            )}

                            <button
                                type="button"
                                className="table-modal-btn table-btn-remove"
                                onClick={() => removeTable(selectedTable)}
                            >
                                Remove Table
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// REUSABLE MODAL
function Modal({ children, eyebrow, title, subtitle, onClose }) {
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            className="table-modal-overlay"
            onMouseDown={e => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="table-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="table-modal-title"
            >
                <header className="table-modal-header">
                    <div className="table-modal-eyebrow">
                        {eyebrow}
                    </div>

                    <h2
                        className="table-modal-title"
                        id="table-modal-title"
                    >
                        {title}
                    </h2>

                    <p className="table-modal-subtitle">
                        {subtitle}
                    </p>

                    <button
                        type="button"
                        className="table-modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </header>

                <div className="table-modal-body">
                    {children}
                </div>
            </section>
        </div>
    );
}

export default ManagerTable;
