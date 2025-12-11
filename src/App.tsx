import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import DashboardLayout from "./components/layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import MenuPage from "./pages/dashboard/MenuPage";
import CartPage from "./pages/dashboard/CartPage";
import CheckoutPage from "./pages/dashboard/CheckoutPage";
import RecipientsPage from "./pages/dashboard/RecipientsPage";
import OrdersPage from "./pages/dashboard/OrdersPage";
import OrderDetailPage from "./pages/dashboard/OrderDetailPage";
import InvoicesPage from "./pages/dashboard/InvoicesPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

// Admin Pages
import AdminLayout from "./components/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMenuPage from "./pages/admin/AdminMenuPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminFinancePage from "./pages/admin/AdminFinancePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Parent Dashboard */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="recipients" element={<RecipientsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Admin Dashboard */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="invoices" element={<AdminFinancePage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
