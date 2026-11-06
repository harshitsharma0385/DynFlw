
import { Link, Routes, Route } from 'react-router-dom';
import DishPage from './pages/DishPage';
import KitchenPage from './pages/KitchenPage';
import CartPage from './pages/CartPage';
import API_BASE_URL from './config/api';
import TableEntry from './pages/TableEntry';
import HomePage from './pages/HomePage';
import ManagerLogin from './pages/ManagerLogin';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerDishes from './pages/ManagerDishes';
import ManagerKitchen from './pages/ManagerKitchen';
import ManagerTable from './pages/ManagerTable';
import ManagerBilling from './pages/ManagerBilling';
import ManagerRestaurantInfo from './pages/ManagerRestaurantInfo';

function App() {
    return (
        <>
            <nav style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #ddd'
            }}>
                {/* <Link to="/">DynFlw</Link>
                <Link to="/cart">View Cart</Link> */}
            </nav>

            <Routes>
                <Route path="/dish/:dishId" element={<DishPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/kitchen" element={<KitchenPage />} />
                <Route path="/t/:qrToken" element={<TableEntry />} />
                <Route path="/" element={<HomePage />} />

                <Route path="/manager/login" element={<ManagerLogin />} />
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route path="/manager/dishes" element={<ManagerDishes />} />
                <Route path="/manager/kitchen" element={<ManagerKitchen />} />
                <Route path="/manager/tables" element={<ManagerTable />} />
                <Route path="/manager/billing" element={<ManagerBilling />} />
                <Route
                    path="/manager/restaurant-info"
                    element={<ManagerRestaurantInfo />}
                />

                <Route
                    path="*"
                    element={
                        <h1 style={{ textAlign: 'center', marginTop: '40px' }}>
                            Welcome to DynFlw
                        </h1>
                    }
                />
            </Routes>
        </>
    );
}

export default App;
