import { api } from "@lib/api";
import type { PeopleMatchesResponse } from "@appTypes/index";

export async function fetchPeopleMatches(moduleCode?: string) {
  const searchParams = new URLSearchParams();

  if (moduleCode) {
    searchParams.set("module_code", moduleCode);
  }

  const path = searchParams.toString()
    ? `/v1/matches/people?${searchParams.toString()}`
    : "/v1/matches/people";

  return api.get<PeopleMatchesResponse>(path);
}
