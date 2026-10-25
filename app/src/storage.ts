import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Item } from "./types";

const KEY = "skt.items.v1";

export async function loadItems(): Promise<Item[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Item[]) : [];
}

export async function saveItems(items: Item[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}
