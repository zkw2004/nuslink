export function getMeetupCloseIso(
  countdown: "1h" | "6h" | "1d" | "3d",
  now = new Date(),
) {
  const closeAt = new Date(now);

  if (countdown === "1h") {
    closeAt.setHours(closeAt.getHours() + 1);
  } else if (countdown === "6h") {
    closeAt.setHours(closeAt.getHours() + 6);
  } else if (countdown === "1d") {
    closeAt.setDate(closeAt.getDate() + 1);
  } else {
    closeAt.setDate(closeAt.getDate() + 3);
  }

  return closeAt.toISOString();
}
