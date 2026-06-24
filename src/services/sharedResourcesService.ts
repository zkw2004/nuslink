import { supabase } from "@lib/supabase";
import type { SharedResource } from "@appTypes/index";
import type { Database } from "@appTypes/database";

type SharedResourceRow = Database["public"]["Tables"]["shared_resources"]["Row"];

type ResourceUploadInput = {
  bytes: ArrayBuffer;
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

type UploadTarget =
  | { communityId: string; groupId?: never }
  | { groupId: string; communityId?: never };

const SHARED_RESOURCES_BUCKET = "shared-resources";

function sanitizeFileName(name: string) {
  const trimmedName = name.trim() || "resource";
  return trimmedName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
}

function stripFileExtension(name: string) {
  return name.replace(/\.[a-zA-Z0-9]+$/, "") || "resource";
}

function getFileExtension(uri: string, mimeType: string, name: string) {
  const source = name || uri;
  const match = source.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);

  if (match?.[1]) {
    return match[1].toLowerCase();
  }

  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "text/plain":
      return "txt";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

function mapSharedResource(resource: SharedResourceRow): SharedResource {
  return {
    id: resource.id,
    owner_id: resource.owner_id,
    group_id: resource.group_id,
    community_id: resource.community_id,
    name: resource.name,
    file_url: resource.file_url,
    file_path: resource.file_path,
    mime_type: resource.mime_type,
    size_bytes: resource.size_bytes,
    created_at: resource.created_at,
  };
}

async function uploadFile(input: ResourceUploadInput) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error(userError?.message ?? "Please sign in again.");
  }

  const safeName = sanitizeFileName(input.name);
  const safeBaseName = stripFileExtension(safeName);
  const extension = getFileExtension(input.uri, input.mimeType, safeName);
  const filePath = `${userData.user.id}/${Date.now()}-${safeBaseName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(SHARED_RESOURCES_BUCKET)
    .upload(filePath, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from(SHARED_RESOURCES_BUCKET)
    .getPublicUrl(filePath);

  return {
    filePath,
    fileUrl: data.publicUrl,
    safeName,
    ownerId: userData.user.id,
  };
}

export async function fetchCommunityResources(communityId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("shared_resources")
    .select("*")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SharedResourceRow[]).map(mapSharedResource);
}

export async function fetchGroupResources(groupId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("shared_resources")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SharedResourceRow[]).map(mapSharedResource);
}

export async function uploadSharedResource(
  target: UploadTarget,
  input: ResourceUploadInput,
) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const uploaded = await uploadFile(input);

  const payload = {
    owner_id: uploaded.ownerId,
    community_id: "communityId" in target ? target.communityId : null,
    group_id: "groupId" in target ? target.groupId : null,
    name: uploaded.safeName,
    file_url: uploaded.fileUrl,
    file_path: uploaded.filePath,
    mime_type: input.mimeType,
    size_bytes: input.size,
  };

  const { data, error } = await supabase
    .from("shared_resources")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapSharedResource(data as SharedResourceRow);
}
