import { create } from "zustand";

import type { SharedResource } from "@appTypes/index";
import {
  fetchCommunityResources,
  fetchGroupResources,
  uploadSharedResource,
} from "@services/sharedResourcesService";

type UploadableResource = {
  bytes: ArrayBuffer;
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

interface SharedResourcesState {
  communityResources: Record<string, SharedResource[]>;
  groupResources: Record<string, SharedResource[]>;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  loadCommunityResources: (communityId: string) => Promise<void>;
  loadGroupResources: (groupId: string) => Promise<void>;
  uploadCommunityResource: (communityId: string, resource: UploadableResource) => Promise<void>;
  uploadGroupResource: (groupId: string, resource: UploadableResource) => Promise<void>;
  reset: () => void;
}

export const useSharedResourcesStore = create<SharedResourcesState>((set) => ({
  communityResources: {},
  groupResources: {},
  isLoading: false,
  isUploading: false,
  error: null,

  async loadCommunityResources(communityId) {
    set({ isLoading: true, error: null });

    try {
      const resources = await fetchCommunityResources(communityId);

      set((state) => ({
        communityResources: {
          ...state.communityResources,
          [communityId]: resources,
        },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load shared resources right now.",
      });
    }
  },

  async loadGroupResources(groupId) {
    set({ isLoading: true, error: null });

    try {
      const resources = await fetchGroupResources(groupId);

      set((state) => ({
        groupResources: {
          ...state.groupResources,
          [groupId]: resources,
        },
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load shared resources right now.",
      });
    }
  },

  async uploadCommunityResource(communityId, resource) {
    set({ isUploading: true, error: null });

    try {
      await uploadSharedResource({ communityId }, resource);
      const refreshedResources = await fetchCommunityResources(communityId);

      set((state) => ({
        communityResources: {
          ...state.communityResources,
          [communityId]: refreshedResources,
        },
        isUploading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isUploading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not upload the shared resource right now.",
      });
      throw error;
    }
  },

  async uploadGroupResource(groupId, resource) {
    set({ isUploading: true, error: null });

    try {
      await uploadSharedResource({ groupId }, resource);
      const refreshedResources = await fetchGroupResources(groupId);

      set((state) => ({
        groupResources: {
          ...state.groupResources,
          [groupId]: refreshedResources,
        },
        isUploading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isUploading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not upload the shared resource right now.",
      });
      throw error;
    }
  },

  reset() {
    set({
      communityResources: {},
      groupResources: {},
      isLoading: false,
      isUploading: false,
      error: null,
    });
  },
}));
