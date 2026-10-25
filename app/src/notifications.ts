import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parseIso } from "./dates";
import type { Item } from "./types";

const HOUR = 9; // Bildirimler sabah 09:00'da gelir

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("skt", {
      name: "Son kullanma uyarıları",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Her değişiklikte tüm planı yeniden kurar: son tarihten bir gün önce, sabah, o gün bitenleri tek bildirimde toplar.
export async function rescheduleExpiryAlerts(items: Item[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const byDay = new Map<string, string[]>();
  for (const it of items) {
    if (it.status !== "active") continue;
    const alert = parseIso(it.expires);
    alert.setDate(alert.getDate() - 1);
    alert.setHours(HOUR, 0, 0, 0);
    if (alert.getTime() <= Date.now()) continue;
    const key = alert.toISOString();
    byDay.set(key, [...(byDay.get(key) ?? []), it.name]);
  }
  for (const [when, names] of byDay) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: names.length === 1 ? `${names[0]} yarın bozuluyor` : `${names.length} ürün yarın bozuluyor`,
        body: `${names.slice(0, 4).join(", ")}. Bugün değerlendirmeye ne dersin?`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(when),
        channelId: "skt",
      },
    });
  }
}
