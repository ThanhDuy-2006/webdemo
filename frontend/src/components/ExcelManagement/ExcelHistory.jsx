import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function ExcelHistory({ history }) {
    const getActionLabel = (action) => {
        switch(action) {
            case 'check': return <span className="action-badge badge-check">Đã tích</span>;
            case 'uncheck': return <span className="action-badge badge-uncheck">Bỏ tích</span>;
            case 'create_item': return <span className="action-badge badge-create">Thêm mục</span>;
            case 'update_item': return <span className="action-badge badge-create">Sửa mục</span>;
            case 'delete_item': return <span className="action-badge badge-delete">Xóa mục</span>;
            default: return action;
        }
    };

    return (
        <div className="excel-history">
            <h3>Lịch sử hoạt động</h3>
            <div className="history-list custom-scrollbar">
                {history.map((log) => (
                    <div key={log.id} className="history-item">
                        <div className="history-time">
                            {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            <span className="opacity-40 ml-1">
                                {new Date(log.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                        <div className="history-content">
                            <strong>{log.user_name}</strong> ({log.role}) 
                            {' '}{getActionLabel(log.action)}{' '} 
                            <strong>{log.item_name}</strong>
                            {log.target_user_name && (
                                <> cho <strong>{log.target_user_name}</strong></>
                            )}
                            {log.details && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5">{log.details}</div>
                            )}
                        </div>
                    </div>
                ))}
                {history.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-sm">Chưa có lịch sử hoạt động</div>
                )}
            </div>
        </div>
    );
}
