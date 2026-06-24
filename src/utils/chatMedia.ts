import type {
  ChatAttachmentKind,
  CommunityChatMessage,
  DirectMessage,
  SharedResource,
} from "@appTypes/index";

export type ChatMediaLink = {
  id: string;
  url: string;
  created_at: string;
  label: string;
};

export type ChatMediaFile = {
  id: string;
  url: string;
  name: string;
  kind: ChatAttachmentKind | "resource";
  created_at: string;
  subtitle: string | null;
};

export type ChatMediaImage = {
  id: string;
  url: string;
  name: string;
  created_at: string;
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

export function extractLinksFromText(text: string | null | undefined) {
  if (!text) {
    return [] as string[];
  }

  return Array.from(new Set(text.match(URL_PATTERN) ?? []));
}

export function formatAttachmentSize(size: number | null | undefined) {
  if (!size) {
    return null;
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDirectMediaCollections(messages: DirectMessage[]) {
  const images: ChatMediaImage[] = [];
  const files: ChatMediaFile[] = [];
  const links: ChatMediaLink[] = [];

  for (const message of messages) {
    if (message.attachment_url && message.attachment_kind === "image") {
      images.push({
        id: message.id,
        url: message.attachment_url,
        name: message.attachment_name ?? "Image",
        created_at: message.created_at,
      });
    }

    if (
      message.attachment_url &&
      message.attachment_kind &&
      message.attachment_kind !== "image"
    ) {
      files.push({
        id: message.id,
        url: message.attachment_url,
        name: message.attachment_name ?? "Attachment",
        kind: message.attachment_kind,
        created_at: message.created_at,
        subtitle: formatAttachmentSize(message.attachment_size),
      });
    }

    for (const url of extractLinksFromText(message.body)) {
      links.push({
        id: `${message.id}:${url}`,
        url,
        created_at: message.created_at,
        label: url,
      });
    }
  }

  return { images, files, links };
}

export function getCommunityMediaCollections(
  messages: CommunityChatMessage[],
  resources: SharedResource[],
) {
  const images: ChatMediaImage[] = [];
  const files: ChatMediaFile[] = [];
  const links: ChatMediaLink[] = [];

  for (const message of messages) {
    if (message.attachment_url && message.attachment_kind === "image") {
      images.push({
        id: message.id,
        url: message.attachment_url,
        name: message.attachment_name ?? "Image",
        created_at: message.created_at,
      });
    }

    if (
      message.attachment_url &&
      message.attachment_kind &&
      message.attachment_kind !== "image"
    ) {
      files.push({
        id: message.id,
        url: message.attachment_url,
        name: message.attachment_name ?? "Attachment",
        kind: message.attachment_kind,
        created_at: message.created_at,
        subtitle: formatAttachmentSize(message.attachment_size),
      });
    }

    for (const url of extractLinksFromText(message.body)) {
      links.push({
        id: `${message.id}:${url}`,
        url,
        created_at: message.created_at,
        label: url,
      });
    }
  }

  for (const resource of resources) {
    const isImage = resource.mime_type.startsWith("image/");

    if (isImage) {
      images.push({
        id: resource.id,
        url: resource.file_url,
        name: resource.name,
        created_at: resource.created_at,
      });
      continue;
    }

    files.push({
      id: resource.id,
      url: resource.file_url,
      name: resource.name,
      kind: "resource",
      created_at: resource.created_at,
      subtitle: formatAttachmentSize(resource.size_bytes),
    });
  }

  return { images, files, links };
}
