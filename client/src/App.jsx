import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Book from './pages/Book.jsx';
import MyReservations from './pages/MyReservations.jsx';
import ReservationDetail from './pages/ReservationDetail.jsx';
import Reception from './pages/Reception.jsx';
import AdminRooms from './pages/AdminRooms.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/reservar/:roomId"
          element={
            <ProtectedRoute roles={['CLIENT']}>
              <Book />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-reservas"
          element={
            <ProtectedRoute roles={['CLIENT']}>
              <MyReservations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservas/:id"
          element={
            <ProtectedRoute>
              <ReservationDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recepcion"
          element={
            <ProtectedRoute roles={['RECEPTIONIST', 'ADMIN']}>
              <Reception />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/habitaciones"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/configuracion"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
