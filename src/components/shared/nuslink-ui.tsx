import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

type HeaderAction = {
  icon: "sparkles" | "gearshape.fill";
  accessibilityLabel: string;
};

type AppScreenHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
};

type AvatarProps = {
  name: string;
  size?: number;
  rounded?: boolean;
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

const avatarPalette = [
  { background: "#D4471C", foreground: "#FFF4EE" },
  { background: "#4A90D9", foreground: "#EFF6FF" },
  { background: "#6E8F77", foreground: "#F1F7F3" },
  { background: "#B46A83", foreground: "#FDF1F5" },
  { background: "#9C7B45", foreground: "#FBF6EC" },
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

export function AppScreenHeader({
  title,
  subtitle,
  actions = [],
}: AppScreenHeaderProps) {
  return (
    <View className="px-5 pt-3 pb-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-[30px] font-bold tracking-tight text-gray-900">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-[14px] leading-5 text-gray-500">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actions.length > 0 ? (
          <View className="flex-row gap-2">
            {actions.map((action) => (
              <Pressable
                key={`${title}-${action.icon}`}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel}
                className="h-10 w-10 items-center justify-center rounded-full border border-[#E8E1D8] bg-white"
              >
                <SymbolView
                  name={{ ios: action.icon, android: "star", web: "star" }}
                  size={18}
                  tintColor={action.icon === "sparkles" ? "#D4471C" : "#2C241E"}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function AppAvatar({ name, size = 56, rounded = true }: AvatarProps) {
  const colors = getAvatarColors(name);

  return (
    <View
      className={`items-center justify-center ${rounded ? "rounded-full" : "rounded-[18px]"}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.background,
      }}
    >
      <Text
        style={{ color: colors.foreground, fontSize: Math.round(size * 0.34) }}
        className="font-bold tracking-tight"
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <View className={`rounded-[22px] border border-[#E8E1D8] bg-white p-4 ${className}`}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, actionLabel }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between gap-3">
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-gray-500">
        {title}
      </Text>
      {actionLabel ? (
        <Text className="text-[13px] font-semibold text-accent">
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

export function AppChip({ label, variant = "default" }: AppChipProps) {
  const variantClasses = {
    default: "border-transparent bg-[#F2EEE7] text-[#5A4B41]",
    module: "border-transparent bg-[#EAF3FB] text-accent",
    outline: "border-[#DED5CA] bg-white text-[#5A4B41]",
    solid: "border-primary bg-primary text-white",
  };

  return (
    <View className={`rounded-full border px-3 py-2 ${variantClasses[variant]}`}>
      <Text className="text-[13px] font-medium">{label}</Text>
    </View>
  );
}

export function BadgeTierPill({ tier }: BadgeTierPillProps) {
  const tierStyles: Record<BadgeTier, { bg: string; text: string }> = {
    New: { bg: "#F4EFE7", text: "#7A6657" },
    Reliable: { bg: "#EAF3FB", text: "#2B73BD" },
    Trusted: { bg: "#EEF6F1", text: "#3F7A55" },
    Standout: { bg: "#FFF2E8", text: "#C66A1A" },
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
    <View className="h-2 overflow-hidden rounded-full bg-[#EFE8DD]">
      <View
        className="h-full rounded-full bg-primary"
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
        ? "bg-[#E6DDD1]"
        : "bg-primary"
      : "border border-[#DED5CA] bg-white";

  const textClassName =
    variant === "primary"
      ? disabled
        ? "text-[#9B8C7D]"
        : "text-white"
      : "text-[#2C241E]";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center rounded-2xl px-4 py-4 ${className}`}
    >
      <Text className={`text-[15px] font-semibold ${textClassName}`}>{label}</Text>
    </Pressable>
  );
}

export function CompatibilityBadge({ score }: CompatibilityBadgeProps) {
  return (
    <View className="h-14 w-14 items-center justify-center rounded-full border-[3px] border-primary/20 bg-primary/5">
      <Text className="text-[16px] font-bold tracking-tight text-primary">
        {score}
      </Text>
      <Text className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.8px] text-primary/70">
        match
      </Text>
    </View>
  );
}
