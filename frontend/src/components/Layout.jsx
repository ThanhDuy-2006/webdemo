import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ThemeCustomizer } from "./ThemeCustomizer";
import { NotificationDropdown } from "./NotificationDropdown";
import { Menu, Wallet as WalletIcon, Bell, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";

import { api } from "../services/api"; // Added import

import Messages from "../pages/Messages";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSuspended, setIsSuspended] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { socket } = useSocket();
  const toast = useToast();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) {
        setUnreadMessages(0);
        return;
    }
    const fetchUnread = async () => {
      try {
        const res = await api.get('/messages/conversations');
        if (Array.isArray(res)) {
          const count = res.reduce((acc, c) => acc + (c.unread_count || 0), 0);
          setUnreadMessages(count);
        }
      } catch (e) {
        console.error("Failed to fetch unread messages", e);
      }
    };
    fetchUnread();
  }, [user]);

  // Realtime Listeners
  useEffect(() => {
    if (!socket || !user) return;

    socket.on("walletUpdated", (data) => {
        toast.success(`Số dư ví đã thay đổi: ${data.newBalance.toLocaleString()}đ`, {
            title: "Ví cập nhật",
            icon: <WalletIcon className="w-5 h-5" />
        });
    });

    socket.on("newNotification", (data) => {
        toast.info(data.message || "Bạn có thông báo mới", {
            title: "Thông báo",
            icon: <Bell className="w-5 h-5" />
        });
    });

    socket.on("newMessage", (data) => {
        // If it's from someone else, increment unread
        if (data.senderId !== user.id) {
            setUnreadMessages(prev => prev + 1);
            if (!showMessages) {
                toast.info(`Tin nhắn mới từ ${data.senderName}`, {
                    title: "Tin nhắn",
                    onClick: () => setShowMessages(true)
                });
            }
        }
    });

    return () => {
        socket.off("walletUpdated");
        socket.off("newNotification");
        socket.off("newMessage");
    };
  }, [socket, user?.id, showMessages]);

  useEffect(() => {
    const handleSuspended = () => setIsSuspended(true);
    window.addEventListener("account-suspended", handleSuspended);
    return () => window.removeEventListener("account-suspended", handleSuspended);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsSuspended(false);
    navigate("/login");
  };

  const menuItems = [
    { path: "/", label: "Trang Chủ", icon: "🖥️", roles: ["admin", "member", null] },
    { path: "/houses", label: "Chợ", icon: "🏠", roles: ["admin", "member", null] },
    { path: "/cart", label: "Giỏ Hàng", icon: "🛒", roles: ["admin", "member"] },
    { path: "/wallet", label: "Ví Tiền", icon: "💰", roles: ["admin", "member"] },
    { path: "/expenses", label: "Chi Tiêu", icon: "💸", roles: ["admin", "member"] },
    { path: "/my-warehouse", label: "Kho Của Tôi", icon: "🎒", roles: ["admin", "member"] },
    { path: "/my-products", label: "Sản phẩm của tôi", icon: "📦", roles: ["admin", "member"] },
    { path: "/profile", label: "Hồ Sơ", icon: "👤", roles: ["admin", "member"] },
    { path: "/entertainment", label: "Giải trí", icon: "🎮", roles: ["admin", "member", null] },
  ];

  const adminItems = [
    { path: "/user-management", label: "Quản Lý Hệ Thống", icon: "⚙️" },
    { path: "/deposit-management", label: "Duyệt Nạp Tiền", icon: "💎" },
    { path: "/user-activity", label: "Thống Kê Truy Cập", icon: "📈" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className={`sidebar custom-sidebar-hidden-scroll ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo flex items-center pr-4 gap-2">
          <Link to="/" className="flex items-center gap-3 hover:no-underline">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-lg shadow-white/5 flex-shrink-0">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                HouseMarket
              </span>
            )}
          </Link>
          
          {/* Menu Button INSIDE Sidebar when expanded */}
          {(!isCollapsed || isMobileOpen) && (
            <button 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-1" 
              onClick={() => {
                if (window.innerWidth <= 1024) {
                    setIsMobileOpen(false);
                } else {
                    setIsCollapsed(true);
                }
              }}
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <nav className="sidebar-menu custom-sidebar-hidden-scroll">
          {/*.regular items*/}
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span className="text">{item.label}</span>
            </Link>
          ))}

          {/* Admin Group */}
          {user?.role === "admin" && (
            <div className={`menu-group ${isAdminOpen ? 'is-open' : ''}`}>
               <button 
                  onClick={() => setIsAdminOpen(!isAdminOpen)}
                  className={`menu-item w-full flex justify-between items-center group/admin`}
               >
                  <div className="flex items-center gap-[14px]">
                    <span className="icon">🛡️</span>
                    <span className="text">Quản Trị Admin</span>
                  </div>
                  {(!isCollapsed || isMobileOpen) && (
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isAdminOpen ? 'rotate-180' : ''}`} />
                  )}
               </button>
               
               <div className={`submenu-wrapper ${isAdminOpen ? 'expanded' : ''} overflow-hidden transition-all duration-300`}>
                  <div className="submenu-content pt-1 pb-1 ml-4 border-l border-white/10">
                    {adminItems.map(sub => (
                       <Link 
                        key={sub.path}
                        to={sub.path}
                        className={`menu-item submenu-item ${isActive(sub.path) ? 'active' : ''}`}
                       >
                          <span className="icon !text-sm">{sub.icon}</span>
                          <span className="text !text-xs opacity-80">{sub.label}</span>
                       </Link>
                    ))}
                  </div>
               </div>
            </div>
          )}
          
          {/* Mobile Login Fallback for sidebar */}
          {!user && (
            <div className="lg:hidden mt-4 pt-4 border-t border-white/5">
              <Link to="/login" className="menu-item text-primary">
                <span className="icon">🔑</span>
                <span className="text">Đăng Nhập</span>
              </Link>
              <Link to="/register" className="menu-item text-blue-400">
                <span className="icon">📝</span>
                <span className="text">Đăng Ký</span>
              </Link>
            </div>
          )}
          
          {user && (
            <div className="mt-10 pt-6 border-t border-white/5 px-4">
               {!isCollapsed && <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Hệ Thống</p>}
               <button onClick={handleLogout} className="menu-item w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300">
                  <span className="icon">🚪</span>
                  <span className="text">Đăng Xuất</span>
               </button>
            </div>
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT Area */}
      <div className="main-wrapper">
        <header className="dashboard-header w-full flex justify-between items-center px-4 py-3 bg-[#0b1020]/90 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
          <div className="header-left flex items-center shrink-0">
            {/* Show Menu Button in Header ONLY when sidebar is collapsed and on Desktop, or always on mobile if not open */}
            {isCollapsed && (
              <button 
                className="toggle-sidebar-btn p-2 rounded-lg hover:bg-white/10 transition-colors" 
                onClick={() => setIsCollapsed(false)}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            )}
            
            {/* Mobile Toggle Button if sidebar is closed */}
            {!isMobileOpen && window.innerWidth <= 1024 && (
               <button 
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" 
                onClick={() => setIsMobileOpen(true)}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          <div className="header-right flex items-center justify-end flex-1 gap-2 ml-auto">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 justify-end w-full">
                {/* Messages Button (Opens Modal) */}
                <button 
                  onClick={() => setShowMessages(true)} 
                  className="btn btn-ghost btn-circle text-white relative"
                >
                  <div className="indicator relative">
                    <span className="text-xl">💬</span>
                    {unreadMessages > 0 && (
                      <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-900 bg-red-600 transform translate-x-1/4 -translate-y-1/4"></span>
                    )}
                  </div>
                </button>
                
                {/* Notification Dropdown */}
                <NotificationDropdown />
                
                <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                
                {/* User Info Block - Restored */}
                <Link to="/profile" className="flex items-center gap-3 hover:bg-white/5 p-1 px-2 rounded-xl transition-all group border border-transparent hover:border-white/10">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors leading-none">{user.full_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{user.role}</p>
                  </div>
                  {user.avatar_url ? (
                    <img 
                      src={(() => {
                        // Fix for mobile: process URL to ensure it's reachable
                        let url = user.avatar_url;
                        if (url && (url.includes("localhost") || url.includes("127.0.0.1"))) {
                           // Convert absolute local URL to relative path to use Vite proxy
                           try {
                             const urlObj = new URL(url);
                             return urlObj.pathname; 
                           } catch (e) { return url; }
                        }
                        return url;
                      })()} 
                      className="w-10 h-10 rounded-xl object-cover border-2 border-primary/20 bg-slate-800 block"
                      alt="Avatar"
                      onError={(e) => {
                        console.error("Avatar load failed:", user.avatar_url);
                        e.target.style.display = 'none';
                        // Show the fallback div
                        const fallback = e.target.nextSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold shadow-inner"
                    style={{ display: user.avatar_url ? 'none' : 'flex' }} // Initially hidden if URL exists
                  >
                    {(user.full_name || "?").charAt(0)}
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex gap-1 sm:gap-2">
                <Link to="/login" className="px-3 py-1.5 text-xs sm:text-sm font-bold text-white hover:text-primary transition-colors">Đăng nhập</Link>
                <Link to="/register" className="bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-lg shadow-primary/20">Đăng ký</Link>
              </div>
            )}
          </div>
        </header>

        <main className="content-viewport">
          <Outlet />
        </main>
        
        <footer className="footer py-6 border-t border-white/5 text-center text-slate-500 text-xs mt-auto">
          &copy; {new Date().getFullYear()} Được Phát Triển Bởi Duy Đẹp Trai. Liên Hệ Gmai Để Được Hỗ Trợ
        </footer>
      </div>

      {/* MESSAGES MODAL */}
      {showMessages && (
        <Messages onClose={() => setShowMessages(false)} />
      )}

      <ThemeCustomizer />

      {/* SUSPENSION OVERLAY */}
      {isSuspended && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="glass p-10 border border-red-500/30 rounded-2xl max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-wider">Tài khoản bị đình chỉ</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Truy cập của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để giải quyết sự cố này.
            </p>
            <button 
              onClick={handleLogout}
              className="btn btn-primary w-full bg-red-600 hover:bg-red-700 border-none shadow-lg shadow-red-900/40 py-4 font-bold"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
