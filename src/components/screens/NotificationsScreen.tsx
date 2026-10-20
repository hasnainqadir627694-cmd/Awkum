import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  FileText,
  Clock,
  CheckSquare,
  AlertCircle,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { NotificationItem } from '../../data/portalData';

interface NotificationsScreenProps {
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onNotificationClick: (notif: NotificationItem) => void;
  onClearAll: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
  onClearAll,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', 'Uploads', 'Schedule', 'Assignments', 'Notices'];

  const filteredNotifications = notifications.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Uploads':
        return <FileText className="w-4 h-4 text-[#493222]" />;
      case 'Schedule':
        return <Clock className="w-4 h-4 text-[#668064]" />;
      case 'Assignments':
        return <CheckSquare className="w-4 h-4 text-[#C84B31]" />;
      case 'Notices':
        return <AlertCircle className="w-4 h-4 text-[#493222]" />;
      default:
        return <Bell className="w-4 h-4 text-[#806A56]" />;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Actions */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            Notifications
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`
              : 'All notifications caught up'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs font-semibold text-[#493222] hover:text-[#38271C] flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#F3E9DD] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-[#493222] text-[#FFF9F1]'
                : 'bg-[#FFF9F1] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-8 text-center">
            <Bell className="w-8 h-8 text-[#806A56] mx-auto mb-2 opacity-60" />
            <h4 className="text-sm font-bold text-[#38271C]">
              No notifications
            </h4>
            <p className="text-xs text-[#806A56] mt-1">
              You are all caught up with your classes and tasks.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => onNotificationClick(item)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer group shadow-2xs relative flex items-start gap-3 active:scale-[0.99] ${
                item.read
                  ? 'bg-[#FFF9F1] border-[#E6D8C7] hover:border-[#806A56]'
                  : 'bg-white border-[#493222]/40 ring-1 ring-[#493222]/10'
              }`}
            >
              {/* Category Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  item.category === 'Assignments'
                    ? 'bg-[#FDE8E4]'
                    : item.category === 'Schedule'
                    ? 'bg-[#EAF2E9]'
                    : 'bg-[#F8F0E5]'
                }`}
              >
                {getCategoryIcon(item.category)}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#38271C] group-hover:text-[#493222] transition-colors truncate">
                    {item.title}
                  </h4>
                  {item.subject && (
                    <span className="text-[10px] font-semibold text-[#806A56] bg-[#F8F0E5] px-1.5 py-0.2 rounded shrink-0">
                      {item.subject}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#806A56] mt-0.5 leading-relaxed">
                  {item.message}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#806A56]/80 font-medium">
                  <span>{item.timestamp}</span>
                  <span>·</span>
                  <span className="text-[#493222] font-semibold group-hover:underline">
                    Tap to view →
                  </span>
                </div>
              </div>

              {/* Unread indicator dot */}
              {!item.read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#C84B31] ring-2 ring-white" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
