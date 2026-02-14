
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import BackButton from '../components/common/BackButton';
import { format } from 'date-fns';

export default function Messages({ onClose }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();
  
  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChatView, setShowChatView] = useState(false); // Mobile: true = show chat, false = show list

  const isModal = !!onClose;

  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
        if (window.innerWidth >= 768) {
            setShowChatView(false); // Reset on desktop
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Query Param
  const [searchParams] = useSearchParams();
  const queryConvoId = searchParams.get("conversationId");

  // Tracking pending requests to avoid double-fetching
  const isFetchingConversations = useRef(false);
  const isFetchingMessages = useRef(false);

  // Fetch Conversations and Auto-Select
  const fetchConversations = async () => {
    if (isFetchingConversations.current) return;
    isFetchingConversations.current = true;
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res);
      setLoading(false);

      // Auto-select if query param exists
      if (queryConvoId && !selectedConversation) {
          const found = res.find(c => c.id == queryConvoId);
          if (found) {
              setSelectedConversation(found);
              setShowChatView(true); // Auto-open chat on mobile
          }
      }
    } catch (error) {
      console.error("Error fetching conversations", error);
    } finally {
      isFetchingConversations.current = false;
    }
  };

  // Initial Load
  useEffect(() => {
    fetchConversations();
  }, [user]); 

  // Realtime Listeners
  useEffect(() => {
      if (!socket || !user) return;

      socket.on("newMessage", (data) => {
          // 1. Update messages if current chat is the active one
          if (selectedConversation && selectedConversation.id === data.conversationId) {
              setMessages(prev => {
                  // If it's your own message from another tab OR the current tab's optimistic one
                  // Try to find if there's an optimistic version of this message
                  const updated = prev.filter(m => !(m.isOptimistic && m.content === data.content));
                  
                  // Avoid duplicate if the real message already exists (id match)
                  if (updated.some(m => m.id === data.id)) return updated;

                  return [...updated, {
                      id: data.id,
                      sender_id: data.senderId,
                      sender_name: data.senderName,
                      content: data.content,
                      created_at: data.created_at
                  }];
              });
              
              // Mark as read immediately if chat is open AND it's from someone else
              if (data.senderId !== user.id) {
                  api.put(`/messages/conversations/${data.conversationId}/read`).catch(() => {});
              }
          }

          // 2. Refresh conversation list to update last_message/unread status
          fetchConversations();
      });

      return () => {
          socket.off("newMessage");
      };
  }, [socket, user, selectedConversation]);

  // Fetch Messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      if (isFetchingMessages.current) return;
      isFetchingMessages.current = true;
      try {
        const res = await api.get(`/messages/conversations/${selectedConversation.id}/messages`);
        setMessages(res);
        // Mark as read locally or call API
        if (selectedConversation.unread_count > 0) {
           await api.put(`/messages/conversations/${selectedConversation.id}/read`);
           fetchConversations(); // Refresh unread count
        }
      } catch (error) {
        console.error("Error fetching messages", error);
      } finally {
        isFetchingMessages.current = false;
      }
    };

    fetchMessages();
  }, [selectedConversation, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !selectedConversation) return;

    // --- OPTIMISTIC MESSAGE ---
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
        id: tempId,
        sender_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
        isOptimistic: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");

    try {
      await api.post('/messages/messages', {
        conversationId: selectedConversation.id,
        content: content
      });
      // The socket will eventually deliver the real message with total consistency.
    } catch (error) {
      // --- ROLLBACK ---
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
      toast.error("Gửi tin nhắn thất bại");
    }
  };

    const containerClass = isModal 
        ? "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fade-in"
        : "container mx-auto p-0 md:p-4 pt-0 md:pt-24 h-screen flex flex-col font-sans";

    const innerClass = isModal
        ? "bg-[#1e1e1e] w-full max-w-6xl h-full md:h-[85vh] md:rounded-xl overflow-hidden shadow-2xl flex border-0 md:border border-white/10 font-sans"
        : "flex-1 flex bg-[#1e1e1e] md:rounded-xl overflow-hidden shadow-2xl border-0 md:border border-white/10";

    return (
        <div className={containerClass}>
            <div className={innerClass}>
                
                {/* SIDEBAR: Conversations List */}
                <div className={`${(isMobile && showChatView) ? 'hidden' : 'flex'} w-full md:w-80 bg-[#1e1e1e] border-r border-white/10 flex-col`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            {!isModal && <BackButton fallbackPath="/" label="Quay lại" className="mb-2 !px-0" />}
                            <h2 className="text-xl font-bold text-white tracking-tight">Tin nhắn</h2>
                        </div>
                        {isModal && (
                            <button 
                                onClick={onClose} 
                                className="btn btn-circle btn-sm bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20 transition-all hover:scale-110 active:scale-95"
                                title="Đóng"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">Đang tải...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Chưa có cuộc trò chuyện nào.
                            </div>
                        ) : (
                            conversations.map(c => {
                                const isSelected = selectedConversation?.id === c.id;
                                const isUnread = c.unread_count > 0;
                                return (
                                    <div 
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedConversation(c);
                                            setShowChatView(true);
                                        }}
                                        className={`px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors
                                            ${isSelected ? 'bg-[#2d2d2d]' : 'hover:bg-[#2a2a2a]'}
                                        `}
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                                                {c.other_user.avatar ? 
                                                    <img src={c.other_user.avatar} className="w-full h-full object-cover" alt="avatar" /> : 
                                                    c.other_user.name.charAt(0)
                                                }
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <span className={`truncate text-[15px] ${isUnread ? 'font-bold text-white' : 'text-gray-200'}`}>
                                                    {c.other_user.name} {c.house_name ? `(${c.house_name})` : ''}
                                                </span>
                                                {c.last_message_time && (
                                                    <span className={`text-[11px] shrink-0 ml-2 ${isUnread ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                                                        {format(new Date(c.last_message_time), 'HH:mm')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <p className={`truncate text-[13px] ${isUnread ? 'font-bold text-white' : 'text-gray-400'}`}>
                                                    {c.last_message || 'Bắt đầu trò chuyện'}
                                                </p>
                                            </div>
                                        </div>

                                        {isUnread && (
                                            <div className="w-3 h-3 bg-blue-500 rounded-full shrink-0 ml-2"></div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* MAIN: Chat Area */}
                <div className={`${(isMobile && !showChatView) ? 'hidden' : 'flex'} flex-1 flex-col bg-[#1e1e1e] relative w-full`}>
                    {selectedConversation ? (
                        <>
                            {/* Header */}
                            <div className="h-16 border-b border-white/10 flex items-center justify-between px-2 md:px-4 bg-[#1e1e1e] shadow-sm z-10 sticky top-0">
                                <div className="flex items-center gap-2 md:gap-3">
                                    {isMobile && (
                                        <button 
                                            onClick={() => setShowChatView(false)}
                                            className="btn btn-ghost btn-circle btn-sm text-white mr-1"
                                        >
                                            ←
                                        </button>
                                    )}
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                        {selectedConversation.other_user.avatar ? 
                                            <img src={selectedConversation.other_user.avatar} className="w-full h-full object-cover" alt="avatar" /> : 
                                            selectedConversation.other_user.name.charAt(0)
                                        }
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="font-bold text-white text-[16px]">
                                                {selectedConversation.other_user.name} {selectedConversation.house_name ? `(${selectedConversation.house_name})` : ''}
                                            </h3>
                                        </div>
                                        {selectedConversation.related_product_id && (
                                            <span className="text-xs text-blue-400">Đang trao đổi về sản phẩm #{selectedConversation.related_product_id}</span>
                                        )}
                                    </div>
                                </div>
                                {isModal && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={onClose} 
                                            className="btn btn-circle btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                                            title="Đóng chat"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar bg-[#1e1e1e]">
                                <div className="space-y-6 pt-4">
                                    {messages.map((msg, index) => {
                                        const isMe = msg.sender_id === user.id;
                                        // Show avatar only for the last message in a consecutive group from the same user
                                        const isLastFromUser = !messages[index + 1] || messages[index + 1].sender_id !== msg.sender_id;
                                        const showAvatar = !isMe && isLastFromUser;

                                        return (
                                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isLastFromUser ? 'mb-4' : 'mb-1'}`}>
                                                
                                                {/* Left Avatar Column (Fixed Width, prevented from shrinking) */}
                                                {!isMe && (
                                                    <div className="flex-none w-8 mr-2 flex flex-col justify-end">
                                                        {showAvatar ? (
                                                            <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden border border-white/10 shadow-sm">
                                                                {msg.sender_avatar ? (
                                                                    <img src={msg.sender_avatar} className="w-full h-full object-cover" alt="avatar" />
                                                                ) : (
                                                                    <span className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold bg-indigo-500">
                                                                        {msg.sender_name?.charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8"></div> // Spacer must match avatar size
                                                        )}
                                                    </div>
                                                )}

                                                {/* Message Bubble Container */}
                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                                    {/* Bubble */}
                                                    <div 
                                                        className={`w-fit px-4 py-2 text-[15px] leading-6 break-words rounded-2xl shadow-sm relative group
                                                            ${isMe 
                                                                ? 'bg-[#0084ff] text-white rounded-tr-sm' 
                                                                : 'bg-[#3e4042] text-white rounded-tl-sm'
                                                            }
                                                        `}
                                                        title={format(new Date(msg.created_at), 'HH:mm')}
                                                    >
                                                        {msg.content || <span className="italic text-gray-400">Tin nhắn bị lỗi</span>}
                                                    </div>
                                                    
                                                    {/* Timestamp (Tiny, below bubble) */}
                                                    {isLastFromUser && (
                                                        <span className="text-[10px] text-gray-500 mt-1 px-1 select-none font-medium opacity-80">
                                                            {format(new Date(msg.created_at), 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-2 md:p-3 bg-[#1e1e1e] border-t border-white/10 sticky bottom-0 z-20">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#3a3b3c] text-white placeholder-gray-400 rounded-full py-2 px-4 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm md:text-base"
                                            placeholder="Nhập tin nhắn..." 
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            autoFocus={!isMobile} // Don't autofocus on mobile to prevent keyboard jump
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={!newMessage.trim()}
                                        className="w-9 h-9 flex items-center justify-center rounded-full text-[#0084ff] hover:bg-[#3a3b3c] disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path></svg>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 select-none relative">
                            {isModal && (
                                <button 
                                    onClick={onClose} 
                                    className="absolute top-4 right-4 btn btn-circle btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                                    title="Đóng chat"
                                >
                                    ✕
                                </button>
                            )}
                            <div className="w-24 h-24 bg-[#2a2a2a] rounded-full flex items-center justify-center mb-4 text-4xl">
                                💬
                            </div>
                            <h3 className="text-xl font-bold text-gray-300 mb-2">Đoạn chat của bạn</h3>
                            <p className="text-sm">Gửi ảnh và tin nhắn riêng tư cho bạn bè.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
