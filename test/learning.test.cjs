const test = require("node:test");
const assert = require("node:assert/strict");

const Learning = require("../public/learning.js");

test("creates a Thai learning card from an English to Thai translation", () => {
  const now = Date.UTC(2026, 4, 27, 9, 0, 0);

  const card = Learning.createCardFromTranslation({
    originalText: "How much is this?",
    translatedText: "อันนี้ราคาเท่าไหร่",
    phonetic: "an nee raa-khaa tao-rai",
    audioBase64: "abc123",
    sourceLang: "en",
    targetLang: "th",
  }, now);

  assert.equal(card.thaiText, "อันนี้ราคาเท่าไหร่");
  assert.equal(card.meaningText, "How much is this?");
  assert.equal(card.phonetic, "an nee raa-khaa tao-rai");
  assert.equal(card.audioBase64, "abc123");
  assert.equal(card.reviewCount, 0);
  assert.equal(card.dueAt, now);
});

test("does not create a learning card when Thai is not involved", () => {
  const card = Learning.createCardFromTranslation({
    originalText: "hello",
    translatedText: "hola",
    sourceLang: "en",
    targetLang: "es",
  });

  assert.equal(card, null);
});

test("upserts duplicate cards by Thai phrase and meaning", () => {
  const first = Learning.createCardFromTranslation({
    originalText: "thank you",
    translatedText: "ขอบคุณ",
    targetLang: "th",
  }, 1);
  const duplicate = Learning.createCardFromTranslation({
    originalText: "  thank   you ",
    translatedText: "ขอบคุณ",
    phonetic: "khop khun",
    targetLang: "th",
  }, 2);

  const firstResult = Learning.upsertCard([], first);
  const secondResult = Learning.upsertCard(firstResult.cards, duplicate);

  assert.equal(firstResult.added, true);
  assert.equal(secondResult.added, false);
  assert.equal(secondResult.cards.length, 1);
  assert.equal(secondResult.cards[0].phonetic, "khop khun");
});

test("can save a translation card as a favorite", () => {
  const card = Learning.createCardFromTranslation({
    originalText: "coffee",
    translatedText: "กาแฟ",
    phonetic: "gaa-fae",
    targetLang: "th",
    favorite: true,
  }, 1);

  assert.equal(card.favorite, true);
});

test("upserting a duplicate can upgrade it to favorite", () => {
  const normal = Learning.createCardFromTranslation({
    originalText: "coffee",
    translatedText: "กาแฟ",
    targetLang: "th",
  }, 1);
  const favorite = Learning.createCardFromTranslation({
    originalText: "coffee",
    translatedText: "กาแฟ",
    targetLang: "th",
    favorite: true,
  }, 2);

  const first = Learning.upsertCard([], normal);
  const second = Learning.upsertCard(first.cards, favorite);

  assert.equal(second.cards.length, 1);
  assert.equal(second.cards[0].favorite, true);
});

test("returns due cards sorted by oldest due time", () => {
  const cards = [
    { id: "later", dueAt: 3000, createdAt: 1 },
    { id: "not-due", dueAt: 5000, createdAt: 2 },
    { id: "now", dueAt: 2000, createdAt: 3 },
  ];

  const dueCards = Learning.getDueCards(cards, 3000);

  assert.deepEqual(dueCards.map((card) => card.id), ["now", "later"]);
});

test("schedules remembered and forgotten reviews", () => {
  const now = Date.UTC(2026, 4, 27, 9, 0, 0);
  const card = Learning.createCardFromTranslation({
    originalText: "water",
    translatedText: "น้ำ",
    targetLang: "th",
  }, now);

  const remembered = Learning.reviewCard([card], card.id, true, now).cards[0];
  assert.equal(remembered.reviewCount, 1);
  assert.equal(remembered.knownCount, 1);
  assert.equal(remembered.intervalDays, 1);
  assert.equal(remembered.dueAt, now + Learning.DAY_MS);

  const forgotten = Learning.reviewCard([remembered], card.id, false, now).cards[0];
  assert.equal(forgotten.reviewCount, 2);
  assert.equal(forgotten.missedCount, 1);
  assert.equal(forgotten.intervalDays, 0);
  assert.equal(forgotten.dueAt, now + Learning.FORGOT_DELAY_MS);
});

test("creates due cards from the Survival Thai starter pack", () => {
  const now = Date.UTC(2026, 4, 27, 9, 0, 0);

  const result = Learning.addStarterPack([], now);

  assert.ok(result.addedCount >= 12);
  assert.equal(result.cards.length, result.addedCount);
  assert.ok(result.cards.every((card) => card.dueAt === now));
  assert.ok(result.cards.some((card) => card.thaiText === "สวัสดีครับ/ค่ะ"));
  assert.ok(result.cards.some((card) => card.meaningText === "Where is the bathroom?"));
});

test("adds the next pack as fifteen more due cards", () => {
  const now = Date.UTC(2026, 4, 27, 9, 0, 0);

  const result = Learning.addPack([], "everyday-thai-1", now);

  assert.equal(result.addedCount, 15);
  assert.equal(result.cards.length, 15);
  assert.ok(result.cards.every((card) => card.dueAt === now));
  assert.ok(result.cards.some((card) => card.meaningText === "Please speak slowly"));
});

test("restores expanded card packs in fifteen-card batches", () => {
  const nonStarterPacks = Learning.PACKS.filter((pack) => pack.id !== "survival-thai");
  const totalCards = Learning.PACKS.reduce((sum, pack) => sum + pack.cards.length, 0);

  assert.ok(totalCards >= 100);
  assert.ok(nonStarterPacks.length >= 6);
  assert.ok(nonStarterPacks.every((pack) => pack.cards.length === 15));
  assert.ok(Learning.PACKS.some((pack) => pack.id === "food-drinks-1"));
  assert.ok(Learning.PACKS.some((pack) => pack.id === "transport-taxi-1"));
  assert.ok(Learning.PACKS.some((pack) => pack.id === "health-emergency-1"));
});

test("does not duplicate starter pack cards", () => {
  const now = Date.UTC(2026, 4, 27, 9, 0, 0);
  const first = Learning.addStarterPack([], now);
  const second = Learning.addStarterPack(first.cards, now + 1000);

  assert.equal(second.addedCount, 0);
  assert.equal(second.cards.length, first.cards.length);
});

test("reports pack progress and missing counts", () => {
  const survival = Learning.addStarterPack([], 1);
  const summaries = Learning.getPackSummaries(survival.cards);
  const survivalSummary = summaries.find((pack) => pack.id === "survival-thai");
  const everydaySummary = summaries.find((pack) => pack.id === "everyday-thai-1");

  assert.equal(survivalSummary.totalCount, 16);
  assert.equal(survivalSummary.missingCount, 0);
  assert.equal(everydaySummary.totalCount, 15);
  assert.equal(everydaySummary.missingCount, 15);
});

test("resets learning cards back to empty", () => {
  const cards = Learning.addStarterPack([], 1).cards;

  assert.deepEqual(Learning.resetCards(cards), []);
});

test("updates a card with generated audio", () => {
  const card = Learning.createCardFromTranslation({
    originalText: "water",
    translatedText: "น้ำ",
    targetLang: "th",
  }, 1);

  const result = Learning.updateCardAudio([card], card.id, "wav-data");

  assert.equal(result.cards[0].audioBase64, "wav-data");
  assert.equal(result.updated, true);
});

test("formats a phonetic label for learning cards", () => {
  assert.equal(Learning.getPhoneticLabel({ phonetic: "pai rong-pha-yaa-baan" }), "Phonetically: pai rong-pha-yaa-baan");
  assert.equal(Learning.getPhoneticLabel({ phonetic: "   " }), "");
});

test("gets available categories with All first", () => {
  const categories = Learning.getCategories([
    { tag: "Food" },
    { tag: "Basics" },
    { tag: "Food" },
    { tag: "Travel", favorite: true },
    { tag: "" },
  ]);

  assert.deepEqual(categories, ["All", "Favorites", "Basics", "Food", "Saved", "Travel"]);
});

test("keeps pack categories available before cards are added", () => {
  const categories = Learning.getAvailableCategories([]);

  assert.equal(categories[0], "All");
  assert.ok(categories.includes("Basics"));
  assert.ok(categories.includes("Food"));
  assert.ok(categories.includes("Health"));
  assert.ok(categories.includes("Hotel"));
  assert.ok(categories.includes("Shopping"));
  assert.ok(categories.includes("Social"));
  assert.ok(categories.includes("Time"));
  assert.ok(categories.includes("Transport"));
});

test("filters cards and due cards by category", () => {
  const cards = [
    { id: "food", tag: "Food", dueAt: 1000 },
    { id: "travel", tag: "Travel", dueAt: 1000, favorite: true },
    { id: "future-food", tag: "Food", dueAt: 5000 },
  ];

  assert.deepEqual(Learning.filterCardsByCategory(cards, "Food").map((card) => card.id), ["food", "future-food"]);
  assert.deepEqual(Learning.filterCardsByCategory(cards, "Favorites").map((card) => card.id), ["travel"]);
  assert.deepEqual(Learning.getDueCards(cards, 1000, "Food").map((card) => card.id), ["food"]);
});
