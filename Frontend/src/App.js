import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import MainPage from "./mainpage/MainPage";
import Login from "./login/Login";
import MultiStepForm from "./user/MultiStepForm";
import AdminDashboard from "./admin/AdminDashboard";
import Userui from "./user/Userui";
import SuperAdminDashboard from "./superadmin/SuperAdminDashboard"; // ✅ Add this
import { AdminProvider } from './contexts/AdminContext';
import './App.css';


function App() {
  return (
    <AdminProvider>
      <Router>
        <MainContent />
      </Router>
    </AdminProvider>
  );
}

const MainContent = () => {
  const location = useLocation();
  const hideNavbar = [
    "/admin-dashboard", 
    "/userui", 
    "/login", 
    "/signup", 
    "/form",
    "/profile"
  ].some(path => location.pathname.startsWith(path)) 
  || location.pathname.startsWith("/superadmin");

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<MultiStepForm />} />
        <Route path="/admin-dashboard/*" element={<AdminDashboard />} />
        <Route path="/userui" element={<Userui />} />
        <Route path="/superadmin/*" element={<SuperAdminDashboard />} />
      </Routes>
    </>
  );
};

export default App;
