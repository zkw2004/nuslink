import { create } from "zustand";

import type { AppNotification } from "@appTypes/index";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@services/notificationsService";

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refreshNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string, userId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  reset: () => void;
}

function getUnreadCount(notifications: AppNotification[]) {
  return notifications.filter((notification) => notification.read_at === null).length;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  async refreshNotifications(userId) {
    set({ isLoading: true, error: null });

    try {
      const notifications = await fetchNotifications(userId);
      set({
        notifications,
        unreadCount: getUnreadCount(notifications),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load notifications right now.",
      });
    }
  },

  async markAsRead(notificationId, userId) {
    await markNotificationAsRead(notificationId);
    await useNotificationsStore.getState().refreshNotifications(userId);
  },

  async markAllAsRead(userId) {
    await markAllNotificationsAsRead(userId);
    await useNotificationsStore.getState().refreshNotifications(userId);
  },

  reset() {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });
  },
}));
