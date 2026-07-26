import { StyleSheet, Text } from "react-native";

import type { ModerationOutcome } from "@appTypes/index";

import { FlaggedVeil } from "./FlaggedVeil";
import { RemovedTombstone } from "./RemovedTombstone";

type PeopleCardBioProps = {
  bio: string;
  verdict?: ModerationOutcome | null;
};

export function PeopleCardBio({ bio, verdict = "allowed" }: PeopleCardBioProps) {
  if (verdict === "blocked") {
    return <RemovedTombstone what="Bio" />;
  }

  if (verdict === "flagged") {
    return (
      <FlaggedVeil compact>
        <Text style={styles.bio} numberOfLines={2}>
          {bio}
        </Text>
      </FlaggedVeil>
    );
  }

  return (
    <Text style={styles.bio} numberOfLines={2}>
      {bio}
    </Text>
  );
}

const styles = StyleSheet.create({
  bio: {
    color: "#42474F",
    fontSize: 13,
    lineHeight: 20,
  },
});
