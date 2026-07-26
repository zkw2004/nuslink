import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import type { ModerationOutcome } from "@appTypes/index";

import { COPY } from "./moderationTheme";
import { FlaggedVeil } from "./FlaggedVeil";
import { RemovedTombstone } from "./RemovedTombstone";

type ModeratedMessageTextProps = {
  text: string;
  verdict?: ModerationOutcome | null;
  mine?: boolean;
  textStyle?: StyleProp<TextStyle>;
};

export function ModeratedMessageText({
  text,
  verdict = "allowed",
  mine = false,
  textStyle,
}: ModeratedMessageTextProps) {
  if (verdict === "blocked") {
    return <RemovedTombstone dark={mine} />;
  }

  if (verdict === "flagged") {
    return (
      <FlaggedVeil dark={mine} compact label={COPY.flaggedMessageLabel}>
        <Text style={[styles.text, mine ? styles.textMine : null, textStyle]}>
          {text}
        </Text>
      </FlaggedVeil>
    );
  }

  return <Text style={[styles.text, textStyle]}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 19,
  },
  textMine: {
    color: "#FFFFFF",
  },
});
