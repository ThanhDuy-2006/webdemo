import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "../hooks/useAuth";

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const isFetching = useRef(false);

  const fetchNotifications = async () => {
    // Only fetch if logged in, tab is active and not already fetching
    if (!user || document.hidden || isFetching.current) return;
    
    isFetching.current = true;
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get("/notifications"),
        api.get("/messages/conversations")
      ]);
      
      if (Array.isArray(notifRes)) {
        setNotifications(notifRes);
        setUnreadCount(notifRes.filter((n) => !n.is_read).length);
      }

      if (Array.isArray(msgRes)) {
        const count = msgRes.reduce((acc, c) => acc + (c.unread_count || 0), 0);
        setUnreadMsgCount(count);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      isFetching.current = false;
    }
  };

  useEffect(() => {
    if (user) {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id, link) => {
    // Optimistic Update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setIsOpen(false);
    if (link) navigate(link);

    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications(); // Sync with server
    } catch (error) {
      console.error("Failed to mark read", error);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic Update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    try {
      await api.put("/notifications/read-all");
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all read", error);
    }
  };

  const getNotificationLink = (n) => {
    // NEW_MESSAGE: Open House Chat Modal
    if (n.type === 'NEW_MESSAGE') {
      const houseId = n.house_id || n.data?.houseId;
      const convoId = n.data?.conversationId;
      const link = `/houses/${houseId}?action=chat&conversationId=${convoId}`;
      return link;
    }
    if (n.type === 'STOCK_REQUEST_APPROVAL') return `/houses/${n.house_id}/warehouse`;
    if (n.type === 'STOCK_APPROVED' || n.type === 'STOCK_REJECTED') return `/my-warehouse`;
    if (n.type === 'PRODUCT_APPROVAL_REQUEST') return `/houses/${n.house_id}`;
    if (n.type === 'PRODUCT_APPROVED' || n.type === 'PRODUCT_REJECTED') return `/products`;
    return '#';
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    } catch (e) {
        return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        className="btn btn-ghost btn-circle relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="indicator">
          <span className="text-xl">🔔</span>
          {(unreadCount > 0 || unreadMsgCount > 0) && (
            <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-900 bg-red-600 transform translate-x-1/4 -translate-y-1/4"></span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-[#1e293b] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-[100] sm:origin-top-right animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0f172a] sticky top-0 z-10">
              <h3 className="font-bold text-white text-lg">Thông báo</h3>
              <button 
                onClick={handleMarkAllRead} 
                className="text-xs font-medium text-primary hover:text-primary-focus hover:underline transition-colors"
              >
                Đánh dấu đã đọc
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-4 text-slate-500">
                   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">🔔</div>
                   <span className="text-sm font-medium">Bạn chưa có thông báo mới</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkRead(n.id, getNotificationLink(n))}
                    className={`block w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group relative ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10 shadow-sm mt-1 ${
                          n.type === 'NEW_MESSAGE' ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30' :
                          n.type.includes('APPROVED') ? 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30' :
                          n.type.includes('REJECTED') ? 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30' :
                          'bg-slate-500/20 text-slate-400 group-hover:bg-slate-500/30'
                      }`}>
                         {n.type === 'NEW_MESSAGE' ? '💬' : 
                          n.type.includes('APPROVED') ? '✅' : 
                          n.type.includes('REJECTED') ? '❌' : 'ℹ️'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                         <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm leading-snug ${!n.is_read ? 'font-bold text-white' : 'text-slate-300'}`}>
                              {n.title}
                            </h4>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 shadow-lg shadow-primary/50"></span>}
                         </div>
                         <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 pr-2">
                           {n.message}
                         </p>
                         <p className="text-[10px] text-slate-500 font-medium pt-1">
                           {formatTime(n.created_at)}
                         </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
