import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { readReceipt, suggestRecipes } from "./src/api";
import { addDays, daysLabel, daysLeft, iso, parseIso, shortDate, today0 } from "./src/dates";
import { rescheduleExpiryAlerts, setupNotifications } from "./src/notifications";
import { guessShelfDays } from "./src/shelfLife";
import { loadItems, saveItems } from "./src/storage";
import type { Item, Recipe } from "./src/types";

const light = {
  bg: "#e9f0ee", card: "#f7faf9", ink: "#16302b", muted: "#5b7069", line: "#cfdcd8",
  yolk: "#e3a019", yolkInk: "#3a2700", fresh: "#2f8a5b", soon: "#d98a0b", bad: "#c8432f", chip: "#dfe9e5",
};
const dark: typeof light = {
  bg: "#0f1917", card: "#172421", ink: "#e4efeb", muted: "#93a8a1", line: "#2a3b37",
  yolk: "#f0b437", yolkInk: "#2a1c00", fresh: "#4fbf86", soon: "#f0a733", bad: "#ec6a55", chip: "#21312d",
};
type Theme = typeof light;
type Tab = "dolap" | "fis" | "tarif";

const uid = () => Math.random().toString(36).slice(2, 10);
const shiftDate = (s: string, n: number) => addDays(n, parseIso(s));

export default function App() {
  const t = useColorScheme() === "dark" ? dark : light;
  const s = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<Tab>("dolap");
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadItems().then((x) => { setItems(x); setLoaded(true); });
    setupNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveItems(items).catch(() => {});
    rescheduleExpiryAlerts(items).catch(() => {});
  }, [items, loaded]);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addMany = (xs: Item[]) => setItems((cur) => [...cur, ...xs]);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style={t === dark ? "light" : "dark"} />
      <View style={s.header}>
        <Text style={s.h1}>
          Buzdolabı <Text style={{ color: t.yolk }}>Dedektifi</Text>
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {tab === "dolap" && <FridgeScreen s={s} t={t} items={items} update={update} addMany={addMany} goRecipes={() => setTab("tarif")} />}
        {tab === "fis" && <ReceiptScreen s={s} t={t} addMany={(xs) => { addMany(xs); setTab("dolap"); }} />}
        {tab === "tarif" && <RecipeScreen s={s} items={items} />}
      </ScrollView>
      <View style={s.tabbar}>
        {([["dolap", "Dolabım"], ["fis", "Fiş ekle"], ["tarif", "Tarif öner"]] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]} accessibilityRole="tab">
            <Text style={[s.tabText, tab === k && s.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

type S = ReturnType<typeof makeStyles>;
const colorFor = (t: Theme, d: number) => (d < 0 ? t.bad : d <= 2 ? t.soon : t.fresh);

function FridgeScreen({ s, t, items, update, addMany, goRecipes }: {
  s: S; t: Theme; items: Item[]; update: (id: string, p: Partial<Item>) => void; addMany: (xs: Item[]) => void; goRecipes: () => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const active = items.filter((i) => i.status === "active").sort((a, b) => a.expires.localeCompare(b.expires));
  const eaten = items.filter((i) => i.status === "eaten").length;
  const trashed = items.filter((i) => i.status === "trashed").length;
  const expired = active.filter((i) => daysLeft(i.expires) < 0);
  const soon = active.filter((i) => { const d = daysLeft(i.expires); return d >= 0 && d <= 2; });

  const add = () => {
    const n = name.trim();
    if (!n) return;
    addMany([{ id: uid(), name: n, qty: qty.trim(), price: null, expires: addDays(guessShelfDays(n)), added: iso(today0()), status: "active" }]);
    setName(""); setQty("");
  };

  return (
    <>
      {(expired.length > 0 || soon.length > 0) && (
        <View style={[s.alert, { borderColor: expired.length ? t.bad : t.soon }]}>
          <Text style={s.alertTitle}>
            {expired.length ? `${expired.length} ürünün tarihi geçti` : `${soon.length} ürün 2 gün içinde bozulacak`}
          </Text>
          <Text style={s.muted}>{[...expired, ...soon].slice(0, 4).map((i) => i.name).join(", ")}</Text>
          <Pressable style={[s.btn, { alignSelf: "flex-start" }]} onPress={goRecipes}>
            <Text style={s.btnText}>Bunlarla tarif bul</Text>
          </Pressable>
        </View>
      )}

      <View style={s.stats}>
        <Stat s={s} n={String(active.length)} label="Dolapta" />
        <Stat s={s} n={String(active.filter((i) => { const d = daysLeft(i.expires); return d >= 0 && d <= 3; }).length)} label="3 gün içinde" color={t.soon} />
        <Stat s={s} n={eaten + trashed ? `${Math.round((100 * eaten) / (eaten + trashed))}%` : "–"} label="Kurtarılan" color={t.fresh} />
      </View>

      {active.length === 0 && <Text style={[s.muted, { textAlign: "center", padding: 24 }]}>Dolap boş. Bir fiş okut ya da aşağıdan ürün ekle.</Text>}
      {active.map((i) => {
        const d = daysLeft(i.expires);
        return (
          <View key={i.id} style={s.item}>
            <View style={[s.strip, { backgroundColor: colorFor(t, d) }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>{i.name}</Text>
              <Text style={s.muted}>{i.qty ? `${i.qty} · ` : ""}SKT {shortDate(i.expires)}</Text>
              <View style={s.acts}>
                <Mini s={s} label="Tükettim" onPress={() => update(i.id, { status: "eaten" })} />
                <Mini s={s} label="Attım" onPress={() => update(i.id, { status: "trashed" })} />
                <Mini s={s} label="+2 gün" onPress={() => update(i.id, { expires: shiftDate(i.expires, 2) })} />
              </View>
            </View>
            <Text style={[s.days, { color: colorFor(t, d) }]}>{daysLabel(d)}</Text>
          </View>
        );
      })}

      <View style={s.card}>
        <Text style={s.label}>ELLE ÜRÜN EKLE</Text>
        <TextInput style={s.input} placeholder="ör. Süzme yoğurt" placeholderTextColor={t.muted} value={name} onChangeText={setName} onSubmitEditing={add} />
        <TextInput style={s.input} placeholder="Miktar (isteğe bağlı)" placeholderTextColor={t.muted} value={qty} onChangeText={setQty} onSubmitEditing={add} />
        <Pressable style={s.btn} onPress={add}><Text style={s.btnText}>Ekle</Text></Pressable>
        <Text style={s.muted}>Son tarih ürüne göre tahmin edilir, listeden "+2 gün" ile düzeltebilirsin.</Text>
      </View>
      {eaten + trashed > 0 && <Text style={s.muted}>Şimdiye kadar {eaten} ürünü tükettin, {trashed} ürünü attın.</Text>}
    </>
  );
}

function ReceiptScreen({ s, t, addMany }: { s: S; t: Theme; addMany: (xs: Item[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<Item[]>([]);

  const pick = async (camera: boolean) => {
    setMsg(null);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setMsg("Kamera izni verilmedi. Ayarlardan izin verebilir ya da galeriden seçebilirsin."); return; }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6, base64: true };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset?.base64) return;
    setBusy(true);
    setMsg("Fişi okuyorum… (yarım dakika sürebilir)");
    try {
      const out = await readReceipt(asset.base64, asset.mimeType ?? "image/jpeg");
      const xs: Item[] = out.items.filter((x) => x.name.trim()).map((x) => ({
        id: uid(), name: x.name.trim(), qty: x.qty, price: x.price,
        expires: addDays(x.shelfDays > 0 ? x.shelfDays : guessShelfDays(x.name)),
        added: iso(today0()), status: "active",
      }));
      setPending(xs);
      setMsg(xs.length ? `${out.store ? out.store + " fişinden " : ""}${xs.length} ürün buldum. Kontrol et, sonra dolaba ekle.` : "Fişte gıda ürünü bulamadım.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  };

  const edit = (id: string, patch: Partial<Item>) => setPending((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <>
      <View style={s.card}>
        <Text style={s.h2}>Market fişini okut</Text>
        <Text style={s.muted}>Ürünleri ve tahmini son kullanma tarihlerini çıkarırım. Gıda dışı kalemleri atlarım.</Text>
        <View style={s.row}>
          <Pressable style={[s.btn, { flex: 1 }]} onPress={() => pick(true)} disabled={busy}><Text style={s.btnText}>Fotoğraf çek</Text></Pressable>
          <Pressable style={[s.btnGhost, { flex: 1 }]} onPress={() => pick(false)} disabled={busy}><Text style={s.btnGhostText}>Galeriden seç</Text></Pressable>
        </View>
        {busy && <ActivityIndicator color={t.yolk} />}
        {msg && <Text style={s.muted}>{msg}</Text>}
      </View>

      {pending.map((p) => (
        <View key={p.id} style={s.card}>
          <TextInput style={s.input} value={p.name} onChangeText={(v) => edit(p.id, { name: v })} />
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} value={p.qty} placeholder="Miktar" placeholderTextColor={t.muted} onChangeText={(v) => edit(p.id, { qty: v })} />
            {p.price != null && <Text style={[s.muted, { alignSelf: "center" }]}>{p.price.toFixed(2).replace(".", ",")} ₺</Text>}
          </View>
          <View style={[s.row, { alignItems: "center" }]}>
            <Text style={s.itemName}>SKT {shortDate(p.expires)}</Text>
            <Mini s={s} label="−1 gün" onPress={() => edit(p.id, { expires: shiftDate(p.expires, -1) })} />
            <Mini s={s} label="+1 gün" onPress={() => edit(p.id, { expires: shiftDate(p.expires, 1) })} />
            <Mini s={s} label="Çıkar" onPress={() => setPending((xs) => xs.filter((x) => x.id !== p.id))} />
          </View>
        </View>
      ))}
      {pending.length > 0 && (
        <Pressable style={s.btn} onPress={() => { addMany(pending.filter((p) => p.name.trim())); setPending([]); setMsg(null); }}>
          <Text style={s.btnText}>{pending.length} ürünü dolaba ekle</Text>
        </Pressable>
      )}
    </>
  );
}

function RecipeScreen({ s, items }: { s: S; items: Item[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const ask = async () => {
    const active = items
      .filter((i) => i.status === "active" && daysLeft(i.expires) >= 0)
      .sort((a, b) => a.expires.localeCompare(b.expires));
    if (!active.length) { setMsg("Tarif için dolapta tarihi geçmemiş ürün yok."); return; }
    setBusy(true); setMsg("Dolabına bakıyorum…");
    try {
      setRecipes(await suggestRecipes(active.map((i) => ({ name: i.name, qty: i.qty, daysLeft: daysLeft(i.expires) }))));
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={s.card}>
        <Text style={s.h2}>Bozulmadan ne pişirsem?</Text>
        <Text style={s.muted}>Son tarihi en yakın ürünleri öne alarak tarif bulurum.</Text>
        <Pressable style={s.btn} onPress={ask} disabled={busy}><Text style={s.btnText}>Tarif öner</Text></Pressable>
        {busy && <ActivityIndicator />}
        {msg && <Text style={s.muted}>{msg}</Text>}
      </View>
      {recipes.map((r, idx) => (
        <View key={idx} style={s.card}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={[s.h2, { flex: 1 }]}>{r.title}</Text>
            <Text style={s.label}>{r.time}</Text>
          </View>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {r.uses.map((u) => <Text key={"u" + u} style={[s.tag, s.tagUse]}>{u}</Text>)}
            {r.missing.map((u) => <Text key={"m" + u} style={[s.tag, s.tagMiss]}>+ {u}</Text>)}
          </View>
          {r.steps.map((st, i) => <Text key={i} style={s.text}>{i + 1}. {st}</Text>)}
        </View>
      ))}
    </>
  );
}

function Stat({ s, n, label, color }: { s: S; n: string; label: string; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statN, color ? { color } : null]}>{n}</Text>
      <Text style={s.label}>{label.toLocaleUpperCase("tr")}</Text>
    </View>
  );
}

function Mini({ s, label, onPress }: { s: S; label: string; onPress: () => void }) {
  return <Pressable style={s.mini} onPress={onPress} hitSlop={6}><Text style={s.miniText}>{label}</Text></Pressable>;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    h1: { fontSize: 30, fontWeight: "800", color: t.ink, letterSpacing: -0.5 },
    h2: { fontSize: 19, fontWeight: "700", color: t.ink },
    body: { padding: 16, gap: 12, paddingBottom: 32 },
    text: { color: t.ink, fontSize: 15, lineHeight: 21 },
    muted: { color: t.muted, fontSize: 13, lineHeight: 18 },
    label: { color: t.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
    card: { backgroundColor: t.card, borderColor: t.line, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
    alert: { backgroundColor: t.card, borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 6 },
    alertTitle: { color: t.ink, fontWeight: "700", fontSize: 16 },
    stats: { flexDirection: "row", gap: 10 },
    stat: { flex: 1, borderTopWidth: 3, borderTopColor: t.ink, paddingTop: 8 },
    statN: { fontSize: 26, fontWeight: "800", color: t.ink, fontVariant: ["tabular-nums"] },
    item: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.card, borderRadius: 10, paddingVertical: 10, paddingRight: 12, overflow: "hidden" },
    strip: { width: 6, alignSelf: "stretch", borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    itemName: { color: t.ink, fontWeight: "600", fontSize: 15 },
    days: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
    acts: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
    mini: { borderWidth: 1, borderColor: t.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: t.card },
    miniText: { color: t.ink, fontSize: 12 },
    row: { flexDirection: "row", gap: 8 },
    input: { borderWidth: 1, borderColor: t.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: t.ink, backgroundColor: t.bg, fontSize: 15 },
    btn: { backgroundColor: t.yolk, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center" },
    btnText: { color: t.yolkInk, fontWeight: "700", fontSize: 15 },
    btnGhost: { borderColor: t.line, borderWidth: 1, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center" },
    btnGhostText: { color: t.ink, fontWeight: "600", fontSize: 15 },
    tag: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden", color: t.ink },
    tagUse: { backgroundColor: t.chip },
    tagMiss: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.bad },
    tabbar: { flexDirection: "row", gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.card },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
    tabOn: { backgroundColor: t.ink },
    tabText: { color: t.ink, fontWeight: "600" },
    tabTextOn: { color: t.card },
  });
}
