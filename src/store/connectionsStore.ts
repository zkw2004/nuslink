import { create } from "zustand";

import type {
  ConnectionRelationshipStatus,
  IncomingConnectionRequest,
} from "@appTypes/index";
import {
  buildRelationshipStatusMap,
  createConnectionRequest,
  fetchConnectionState,
  respondToConnectionRequest,
} from "@services/connectionsService";

interface ConnectionsState {
  connectedUserIds: string[];
  incomingRequests: IncomingConnectionRequest[];
  outgoingRequestRecipientIds: string[];
  incomingRequesterIds: string[];
  isLoading: boolean;
  error: string | null;
  refreshConnections: (userId: string) => Promise<void>;
  sendConnectionRequest: (recipientId: string, userId: string) => Promise<void>;
  handleConnectionRequest: (
    requestId: string,
    decision: "accepted" | "declined",
    userId: string,
  ) => Promise<void>;
  getRelationshipStatus: (
    candidateUserId: string,
  ) => ConnectionRelationshipStatus;
  reset: () => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  connectedUserIds: [],
  incomingRequests: [],
  outgoingRequestRecipientIds: [],
  incomingRequesterIds: [],
  isLoading: false,
  error: null,

  async refreshConnections(userId) {
    set({ isLoading: true, error: null });

    try {
      const connectionState = await fetchConnectionState(userId);
      set({
        connectedUserIds: connectionState.connectedUserIds,
        incomingRequests: connectionState.incomingRequests,
        outgoingRequestRecipientIds: connectionState.outgoingRequestRecipientIds,
        incomingRequesterIds: connectionState.incomingRequesterIds,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        connectedUserIds: [],
        incomingRequests: [],
        outgoingRequestRecipientIds: [],
        incomingRequesterIds: [],
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load connection requests right now.",
      });
    }
  },

  async sendConnectionRequest(recipientId, userId) {
    await createConnectionRequest(recipientId);
    await get().refreshConnections(userId);
  },

  async handleConnectionRequest(requestId, decision, userId) {
    await respondToConnectionRequest(requestId, decision);
    await get().refreshConnections(userId);
  },

  getRelationshipStatus(candidateUserId) {
    const statusMap = buildRelationshipStatusMap(
      get().connectedUserIds,
      get().incomingRequesterIds,
      get().outgoingRequestRecipientIds,
    );

    return statusMap.get(candidateUserId) ?? "none";
  },

  reset() {
    set({
      connectedUserIds: [],
      incomingRequests: [],
      outgoingRequestRecipientIds: [],
      incomingRequesterIds: [],
      isLoading: false,
      error: null,
    });
  },
}));
