import { api } from "@lib/api";
import type { ChatKind, MeetupSuggestion } from "@appTypes/index";

type MeetupSuggestionsResponse = {
  suggestions: MeetupSuggestion[];
};

export async function fetchMeetupSuggestions(kind: ChatKind, chatId: string) {
  const searchParams = new URLSearchParams({
    kind,
    chat_id: chatId,
  });

  return api.get<MeetupSuggestionsResponse>(
    `/v1/meetups/suggestions?${searchParams.toString()}`,
  );
}
