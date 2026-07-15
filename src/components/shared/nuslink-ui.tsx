import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useNotificationsStore } from "@store/index";
import { GlassSurface } from "./liquid-glass";

type HeaderAction = {
  icon: "sparkles" | "gearshape.fill" | "pencil";
  accessibilityLabel: string;
  onPress?: () => void;
};

type AppScreenHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  hideNotificationsAction?: boolean;
};

type AvatarProps = {
  name: string;
  size?: number;
  rounded?: boolean;
  imageUri?: string | null;
};

type SectionCardProps = {
  children: React.ReactNode;
  className?: string;
};

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
};

type AppChipProps = {
  label: string;
  variant?: "default" | "module" | "outline" | "solid";
};

type BadgeTier = "New" | "Reliable" | "Trusted" | "Standout";

type BadgeTierPillProps = {
  tier: BadgeTier;
};

type ProgressBarProps = {
  value: number;
};

type AppButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onPress?: () => void;
};

type CompatibilityBadgeProps = {
  score: number;
};

type AppNotificationBellProps = {
  unreadCount: number;
  onPress: () => void;
};

const avatarPalette = [
  { background: "#A5BBD5", foreground: "#F8FBFF" },
  { background: "#8AA1BC", foreground: "#F8FBFF" },
  { background: "#B7C5D8", foreground: "#FFFFFF" },
  { background: "#9AAEC8", foreground: "#F7FAFE" },
  { background: "#C2CFDF", foreground: "#FFFFFF" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function getAvatarColors(name: string) {
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
}

function formatUnreadCount(count: number) {
  return count > 9 ? "9+" : String(count);
}

export function AppNotificationBell({
  unreadCount,
  onPress,
}: AppNotificationBellProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Open notifications, ${formatUnreadCount(unreadCount)} unread`
          : "Open notifications"
      }
      onPress={onPress}
      style={styles.notificationButton}
    >
      <GlassSurface
        radius={21}
        intensity={40}
        fill="rgba(255,255,255,0.4)"
        style={styles.notificationGlass}
      >
        <Ionicons name="notifications-outline" size={19} color="#33333F" />
      </GlassSurface>
      {unreadCount > 0 ? (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>
            {formatUnreadCount(unreadCount)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AppScreenHeader({
  title,
  subtitle,
  actions = [],
  hideNotificationsAction = false,
}: AppScreenHeaderProps) {
  const router = useRouter();
  const unreadCount = useNotificationsStore((state) => state.unreadCount);

  return (
    <View className="px-4 pt-6 pb-2">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="pl-1 text-[22px] font-bold tracking-[-0.6px] text-[#0F1115]">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 pl-1 text-[13px] leading-5 text-[#5C6370]">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {!hideNotificationsAction || actions.length > 0 ? (
          <View className="flex-row gap-2">
            {!hideNotificationsAction ? (
              <AppNotificationBell
                unreadCount={unreadCount}
                onPress={() => {
                  router.push("/(tabs)/notifications");
                }}
              />
            ) : null}
            {actions.map((action) => (
              <Pressable
                key={`${title}-${action.icon}`}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#EEF2F7]"
                onPress={action.onPress}
              >
                <SymbolView
                  name={{ ios: action.icon, android: "star", web: "star" }}
                  size={18}
                  tintColor="#0F1115"
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    alignItems: "flex-start",
    height: 46,
    justifyContent: "center",
    position: "relative",
    width: 50,
  },
  notificationGlass: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: "#E5484D",
    borderColor: "#F4F6FD",
    borderRadius: 11,
    borderWidth: 2,
    minWidth: 22,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 5,
    position: "absolute",
    right: 2,
    top: 2,
    shadowColor: "#7A2230",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
});

export function AppAvatar({
  name,
  size = 56,
  rounded = true,
  imageUri = null,
}: AvatarProps) {
  const colors = getAvatarColors(name);
  const borderRadius = rounded ? size / 2 : 18;

  return (
    <View
      className={`items-center justify-center ${rounded ? "rounded-full" : "rounded-[18px]"}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.background,
        overflow: "hidden",
      }}
    >
      {imageUri ? (
        <Image
          key={imageUri}
          source={{ uri: imageUri, cache: "reload" }}
          style={{ width: size, height: size, borderRadius }}
        />
      ) : (
        <Text
          style={{ color: colors.foreground, fontSize: Math.round(size * 0.34) }}
          className="font-bold tracking-tight"
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <View
      className={`rounded-[18px] border border-[#E4E9F1] bg-white p-4 ${className}`}
      style={{
        shadowColor: "#141C2E",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, actionLabel }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between gap-3">
      <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#9AA0AB]">
        {title}
      </Text>
      {actionLabel ? (
        <Text className="text-[13px] font-semibold text-[#5B7BA3]">
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

export function AppChip({ label, variant = "default" }: AppChipProps) {
  const containerClasses = {
    default: "border-transparent bg-[#EEF2F7]",
    module: "border-transparent bg-[#E1EAF5]",
    outline: "border-[#E4E9F1] bg-white",
    solid: "border-[#0F1115] bg-[#0F1115]",
  };

  const textClasses = {
    default: "text-[#5C6370]",
    module: "text-[#5B7BA3]",
    outline: "text-[#5C6370]",
    solid: "text-white",
  };

  return (
    <View className={`rounded-full border px-3 py-[7px] ${containerClasses[variant]}`}>
      <Text className={`text-[13px] font-medium ${textClasses[variant]}`}>{label}</Text>
    </View>
  );
}

export function BadgeTierPill({ tier }: BadgeTierPillProps) {
  const tierStyles: Record<BadgeTier, { bg: string; text: string }> = {
    New: { bg: "#F1F3F6", text: "#7A8595" },
    Reliable: { bg: "#E1EAF5", text: "#5B7BA3" },
    Trusted: { bg: "#E7F0EA", text: "#3F7D63" },
    Standout: { bg: "#EEF2F7", text: "#0F1115" },
  };

  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: tierStyles[tier].bg }}
    >
      <Text
        className="text-[10px] font-bold uppercase tracking-[0.8px]"
        style={{ color: tierStyles[tier].text }}
      >
        {tier}
      </Text>
    </View>
  );
}

export function ProgressBar({ value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <View className="h-[6px] overflow-hidden rounded-full bg-[#E4E9F1]">
      <View
        className="h-full rounded-full bg-[#0F1115]"
        style={{ width: `${safeValue}%` }}
      />
    </View>
  );
}

export function AppButton({
  label,
  variant = "primary",
  disabled = false,
  onPress,
}: AppButtonProps) {
  const className =
    variant === "primary"
      ? disabled
        ? "bg-[#CCD5E0]"
        : "bg-[#0F1115]"
      : "border border-[#D0D7E2] bg-white";

  const textClassName =
    variant === "primary"
      ? disabled
        ? "text-[#6B7280]"
        : "text-white"
      : "text-[#0F1115]";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center rounded-[12px] px-4 py-[10px] ${className}`}
    >
      <Text className={`text-[15px] font-semibold ${textClassName}`}>{label}</Text>
    </Pressable>
  );
}

export function CompatibilityBadge({ score }: CompatibilityBadgeProps) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-full border-[4px] border-[#E4E9F1] bg-white">
      <Text className="text-[15px] font-bold tracking-tight text-[#0F1115]">
        {score}
      </Text>
      <Text className="-mt-0.5 text-[9px] font-semibold uppercase tracking-[0.8px] text-[#9AA0AB]">
        %
      </Text>
    </View>
  );
}
