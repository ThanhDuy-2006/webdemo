import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';

export function HouseChat({ houseId, currentUserId, onClose, initialConversationId }) {
    const { user } = useAuth();
    const toast = useToast();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const [showMembers, setShowMembers] = useState(false);
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    const isFetchingConversations = useRef(false);
    const isFetchingMessages = useRef(false);

    // Initial Load & Polling for Conversations
    useEffect(() => {
        loadConversations();
        const interval = setInterval(() => {
            if (!document.hidden && user) {
                loadConversations();
            }
        }, 30000); // 30s interval
        return () => clearInterval(interval);
    }, [houseId, user]);

    // Auto-select conversation logic
    useEffect(() => {
        const selectConversation = async () => {
             if (initialConversationId) {
                const found = conversations.find(c => c.id == initialConversationId);
                
                if (found) {
                    if (found.id !== selectedConversation?.id) {
                        setSelectedConversation(found);
                    }
                } else if (!isFetchingConversations.current) {
                    // Fallback fetch
                    isFetchingConversations.current = true;
                    try {
                        const res = await api.get(`/messages/conversations/${initialConversationId}`);
                        if (res && res.id) {
                            if (res.house_id == houseId) {
                                setConversations(prev => {
                                    if (prev.find(c => c.id === res.id)) return prev;
                                    return [res, ...prev];
                                });
                                setSelectedConversation(res);
                            }
                        }
                    } catch (e) {
                         console.error("Failed to fetch initial conversation", e);
                    } finally {
                        isFetchingConversations.current = false;
                    }
                }
            }
        };
        selectConversation();
    }, [conversations, initialConversationId, houseId]); 

    const loadConversations = async () => {
        if (isFetchingConversations.current) return;
        isFetchingConversations.current = true;
        try {
            const res = await api.get(`/messages/conversations?house_id=${houseId}`);
            setConversations(Array.isArray(res) ? res : []); 
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        } finally {
            isFetchingConversations.current = false;
        }
    };

    const loadMembers = async () => {
        setLoadingMembers(true);
        try {
            const res = await api.get(`/houses/${houseId}/members?status=member`);
            setMembers(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMembers(false);
        }
    };

    const startConversationWithMember = async (targetUserId) => {
        if (targetUserId === currentUserId) return; // Can't chat with self
        
        try {
            const res = await api.post('/messages/conversations', {
                targetUserId: targetUserId,
                houseId: houseId
            });
            
            // Add to list if not present
            setConversations(prev => {
                if (prev.find(c => c.id === res.id)) return prev;
                return [res, ...prev];
            });
            
            setSelectedConversation(res);
            setShowMembers(false); // Switch back to chat list
        } catch (e) {
            console.error(e);
            toast.error("Không thể bắt đầu cuộc trò chuyện");
        }
    };

    // Load Messages for Selected Conversation
    useEffect(() => {
        if (!selectedConversation) return;
        loadMessages();
        const interval = setInterval(() => {
            if (!document.hidden && user) {
                loadMessages();
            }
        }, 15000); // 15s interval for active chat
        return () => clearInterval(interval);
    }, [selectedConversation?.id, user]); 

    const loadMessages = async () => {
        if (!selectedConversation || isFetchingMessages.current) return;
        isFetchingMessages.current = true;
        try {
            const res = await api.get(`/messages/conversations/${selectedConversation.id}/messages`);
            setMessages(Array.isArray(res) ? res : []);
            
            // Mark as read if needed
            if (selectedConversation.unread_count > 0) {
                 await api.put(`/messages/conversations/${selectedConversation.id}/read`);
                 // Optimistically update local state to avoid flicker
                 setConversations(prev => prev.map(c => 
                    c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c
                 ));
            }
        } catch (e) {
            console.error(e);
        } finally {
            isFetchingMessages.current = false;
        }
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        const content = newMessage;
        setNewMessage(""); // Optimistic clear

        try {
            await api.post('/messages/messages', {
                conversationId: selectedConversation.id,
                content: content
            });
            loadMessages();
            loadConversations(); // Update "Last message" in sidebar
        } catch (e) {
            console.error(e);
            toast.error("Gửi tin nhắn thất bại");
            setNewMessage(content); // Restore if failed
        }
    };

    const handleToggleMembers = () => {
        if (!showMembers) {
            loadMembers();
        }
        setShowMembers(!showMembers);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#1e1e1e] w-full max-w-6xl h-[85vh] rounded-xl overflow-hidden shadow-2xl flex border border-white/10 font-sans">
                
                {/* SIDEBAR: Conversations List */}
                <div className="w-80 bg-[#1e1e1e] border-r border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {showMembers ? 'Thành viên' : 'Chat'}
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleToggleMembers} 
                                className={`btn btn-circle btn-sm ${showMembers ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
                                data-tip={showMembers ? "Quay lại chat" : "Tìm người chat"}
                            >
                                {showMembers ? '↩️' : '👥'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {showMembers ? (
                            // MEMBER LIST VIEW
                            <div className="p-2 space-y-1">
                                {loadingMembers ? (
                                    <div className="p-4 text-center text-gray-500">Đang tải...</div>
                                ) : members.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">Không có thành viên nào khác.</div>
                                ) : (
                                    members.map(m => {
                                        if (m.id === currentUserId) return null; // Hide self
                                        return (
                                            <div 
                                                key={m.id}
                                                onClick={() => startConversationWithMember(m.id)}
                                                className="px-3 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#2a2a2a] rounded-lg transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-200 font-bold border border-indigo-500/30">
                                                    {m.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium text-sm truncate">{m.full_name}</p>
                                                    <p className="text-xs text-gray-500 uppercase">{m.role === 'owner' ? '👑 Chủ nhà' : 'Thành viên'}</p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="btn btn-xs btn-circle btn-primary">💬</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            // CONVERSATION LIST VIEW
                            loading ? (
                                <div className="p-4 text-center text-gray-500">Đang tải...</div>
                            ) : conversations.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Chưa có cuộc trò chuyện nào.<br/>
                                    <button onClick={handleToggleMembers} className="text-blue-400 hover:underline mt-2">
                                        Bắt đầu cuộc trò chuyện mới
                                    </button>
                                </div>
                            ) : (
                                conversations.map(c => {
                                    const isSelected = selectedConversation?.id === c.id;
                                    const isUnread = c.unread_count > 0;
                                    return (
                                        <div 
                                            key={c.id}
                                            onClick={() => setSelectedConversation(c)}
                                            className={`px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors
                                                ${isSelected ? 'bg-[#2d2d2d]' : 'hover:bg-[#2a2a2a]'}
                                            `}
                                        >
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                                                    {c.other_user.avatar ? 
                                                        <img src={c.other_user.avatar} className="w-full h-full object-cover" /> : 
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
                            )
                        )}
                    </div>
                </div>

                {/* MAIN: Chat Area */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e] relative">
                    {selectedConversation ? (
                        <>
                            {/* Header */}
                            <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-[#1e1e1e] shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                        {selectedConversation.other_user.avatar ? 
                                            <img src={selectedConversation.other_user.avatar} className="w-full h-full object-cover" /> : 
                                            selectedConversation.other_user.name.charAt(0)
                                        }
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="font-bold text-white text-[16px]">
                                                {selectedConversation.other_user.name} {selectedConversation.house_name ? `(${selectedConversation.house_name})` : ''}
                                            </h3>
                                        </div>
                                        <span className="text-xs text-green-500 font-medium">Đang hoạt động</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={onClose} 
                                        className="btn btn-circle btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                                        title="Đóng chat"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar bg-[#1e1e1e]">
                                <div className="space-y-6 pt-4"> {/* Spacing between message groups */}
                                    {/* Optimization: Group messages? For now, render individually like Messenger */}
                                    {messages.map((msg, index) => {
                                        const isMe = msg.sender_id === currentUserId;
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
                            <div className="p-3 bg-[#1e1e1e]">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#3a3b3c] text-white placeholder-gray-400 rounded-full py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-gray-500"
                                            placeholder="Nhập tin nhắn..." 
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            autoFocus
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
                            <button 
                                onClick={onClose} 
                                className="absolute top-4 right-4 btn btn-circle btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                                title="Đóng chat"
                            >
                                ✕
                            </button>
                            <div className="w-24 h-24 bg-[#2a2a2a] rounded-full flex items-center justify-center mb-4 text-4xl">
                                💬
                            </div>
                            <h3 className="text-xl font-bold text-gray-300 mb-2">Đoạn chat của bạn</h3>
                            <p className="text-sm">Gửi ảnh và tin nhắn riêng tư cho bạn bè.</p>
                            <button onClick={handleToggleMembers} className="btn btn-primary btn-sm mt-4">
                                Tìm người chat
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
