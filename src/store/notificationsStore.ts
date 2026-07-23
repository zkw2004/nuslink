import { create } from "zustand";

import type { AppNotification } from "@appTypes/index";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@services/notificationsService";
import { evaluateSmartNudges } from "@services/nudgesService";

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

const NUDGE_EVALUATION_INTERVAL_MS = 15 * 60 * 1000;
const lastNudgeEvaluationByUser = new Map<string, number>();

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
      const lastEvaluation = lastNudgeEvaluationByUser.get(userId) ?? 0;
      if (Date.now() - lastEvaluation >= NUDGE_EVALUATION_INTERVAL_MS) {
        try {
          await evaluateSmartNudges();
          lastNudgeEvaluationByUser.set(userId, Date.now());
        } catch {
          // Existing notifications remain available if nudge evaluation is offline.
        }
      }

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
    lastNudgeEvaluationByUser.clear();
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    });
  },
}));
