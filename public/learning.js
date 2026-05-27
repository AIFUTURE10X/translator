(function attachLearning(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.ThaiLearning = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildLearningApi() {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const FORGOT_DELAY_MS = 10 * 60 * 1000;
  const INTERVALS = [1, 3, 7, 14, 30, 60];
  const PACKS = [
    {
      id: "survival-thai",
      name: "Survival Thai",
      description: "First phrases for shops, food, travel, and emergencies.",
      cards: [
        { thaiText: "สวัสดีครับ/ค่ะ", meaningText: "Hello", phonetic: "sa-wat-dee khrap/kha", tag: "Basics" },
        { thaiText: "ขอบคุณครับ/ค่ะ", meaningText: "Thank you", phonetic: "khop khun khrap/kha", tag: "Basics" },
        { thaiText: "ขอโทษครับ/ค่ะ", meaningText: "Sorry / excuse me", phonetic: "khor thot khrap/kha", tag: "Basics" },
        { thaiText: "ใช่", meaningText: "Yes", phonetic: "chai", tag: "Basics" },
        { thaiText: "ไม่ใช่", meaningText: "No / not correct", phonetic: "mai chai", tag: "Basics" },
        { thaiText: "ราคาเท่าไหร่", meaningText: "How much is it?", phonetic: "raa-khaa tao-rai", tag: "Shopping" },
        { thaiText: "ลดได้ไหม", meaningText: "Can you discount it?", phonetic: "lot dai mai", tag: "Shopping" },
        { thaiText: "เอาอันนี้", meaningText: "I will take this one", phonetic: "ao an nee", tag: "Shopping" },
        { thaiText: "ไม่เผ็ด", meaningText: "Not spicy", phonetic: "mai phet", tag: "Food" },
        { thaiText: "ขอน้ำเปล่า", meaningText: "Can I have water?", phonetic: "khor naam plao", tag: "Food" },
        { thaiText: "อร่อยมาก", meaningText: "Very delicious", phonetic: "a-roi maak", tag: "Food" },
        { thaiText: "ไปที่นี่", meaningText: "Go here", phonetic: "bpai tee nee", tag: "Travel" },
        { thaiText: "จอดตรงนี้", meaningText: "Stop here", phonetic: "jot trong nee", tag: "Travel" },
        { thaiText: "ห้องน้ำอยู่ที่ไหน", meaningText: "Where is the bathroom?", phonetic: "hong naam yoo tee nai", tag: "Travel" },
        { thaiText: "ช่วยด้วย", meaningText: "Please help", phonetic: "chuay duay", tag: "Emergency" },
        { thaiText: "ไปโรงพยาบาล", meaningText: "Go to the hospital", phonetic: "bpai rong pha-yaa-baan", tag: "Emergency" },
      ],
    },
    {
      id: "everyday-thai-1",
      name: "Everyday Thai 1",
      description: "15 more useful phrases for directions, hotels, food, and shopping.",
      cards: [
        { thaiText: "ไม่เข้าใจ", meaningText: "I do not understand", phonetic: "mai khao jai", tag: "Basics" },
        { thaiText: "พูดช้าๆ ได้ไหม", meaningText: "Please speak slowly", phonetic: "phuut chaa chaa dai mai", tag: "Basics" },
        { thaiText: "พูดภาษาอังกฤษได้ไหม", meaningText: "Do you speak English?", phonetic: "phuut phaa-saa ang-grit dai mai", tag: "Basics" },
        { thaiText: "ที่นี่คือที่ไหน", meaningText: "Where is this place?", phonetic: "tee nee kheu tee nai", tag: "Travel" },
        { thaiText: "เลี้ยวซ้าย", meaningText: "Turn left", phonetic: "liao saai", tag: "Travel" },
        { thaiText: "เลี้ยวขวา", meaningText: "Turn right", phonetic: "liao khwaa", tag: "Travel" },
        { thaiText: "ตรงไป", meaningText: "Go straight", phonetic: "dtrong bpai", tag: "Travel" },
        { thaiText: "อยากได้กาแฟ", meaningText: "I want coffee", phonetic: "yaak dai gaa-fae", tag: "Food" },
        { thaiText: "ไม่ใส่น้ำตาล", meaningText: "No sugar", phonetic: "mai sai naam-dtaan", tag: "Food" },
        { thaiText: "เช็คบิลด้วย", meaningText: "The bill, please", phonetic: "chek bin duay", tag: "Food" },
        { thaiText: "แพงไป", meaningText: "Too expensive", phonetic: "phaeng bpai", tag: "Shopping" },
        { thaiText: "มีอันนี้ไหม", meaningText: "Do you have this?", phonetic: "mee an nee mai", tag: "Shopping" },
        { thaiText: "ขอแค่ดูก่อน", meaningText: "I am just looking", phonetic: "khor khae duu gon", tag: "Shopping" },
        { thaiText: "มีการจอง", meaningText: "I have a booking", phonetic: "mee gaan jong", tag: "Hotel" },
        { thaiText: "ต้องการหมอ", meaningText: "I need a doctor", phonetic: "dtong gaan mor", tag: "Emergency" },
      ],
    },
  ];
  const STARTER_PACK = PACKS[0].cards;

  function normalizeText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function hashText(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function inferTag(text) {
    const value = normalizeText(text).toLowerCase();
    if (/(menu|food|eat|drink|water|rice|spicy|coffee|restaurant|อาหาร|น้ำ|ข้าว)/.test(value)) return "Food";
    if (/(taxi|grab|car|bus|train|airport|hotel|ไป|รถ|สนามบิน|โรงแรม)/.test(value)) return "Travel";
    if (/(price|cost|buy|sell|market|money|ราคา|บาท|ซื้อ|ขาย)/.test(value)) return "Shopping";
    if (/(hello|thank|sorry|please|yes|no|สวัสดี|ขอบคุณ|ขอโทษ)/.test(value)) return "Basics";
    return "Saved";
  }

  function createCardFromTranslation(input, now) {
    const createdAt = typeof now === "number" ? now : Date.now();
    const sourceLang = input && input.sourceLang ? input.sourceLang : "auto";
    const targetLang = input && input.targetLang ? input.targetLang : "th";
    const originalText = normalizeText(input && input.originalText);
    const translatedText = normalizeText(input && input.translatedText);

    if (!originalText || !translatedText) return null;

    let thaiText = "";
    let meaningText = "";
    if (targetLang === "th") {
      thaiText = translatedText;
      meaningText = originalText;
    } else if (sourceLang === "th") {
      thaiText = originalText;
      meaningText = translatedText;
    } else {
      return null;
    }

    const idSeed = `${thaiText.toLowerCase()}|${meaningText.toLowerCase()}`;
    return {
      id: `thai_${createdAt}_${hashText(idSeed)}`,
      thaiText,
      meaningText,
      phonetic: normalizeText(input && input.phonetic),
      audioBase64: input && input.audioBase64 ? String(input.audioBase64) : "",
      tag: inferTag(`${thaiText} ${meaningText}`),
      favorite: Boolean(input && input.favorite),
      createdAt,
      updatedAt: createdAt,
      dueAt: createdAt,
      intervalDays: 0,
      reviewCount: 0,
      knownCount: 0,
      missedCount: 0,
    };
  }

  function createPackCard(item, packId, now) {
    const createdAt = typeof now === "number" ? now : Date.now();
    const idSeed = `${item.thaiText.toLowerCase()}|${item.meaningText.toLowerCase()}`;
    return {
      id: `pack_${packId}_${hashText(idSeed)}`,
      thaiText: item.thaiText,
      meaningText: item.meaningText,
      phonetic: item.phonetic,
      audioBase64: "",
      tag: item.tag,
      favorite: false,
      createdAt,
      updatedAt: createdAt,
      dueAt: createdAt,
      intervalDays: 0,
      reviewCount: 0,
      knownCount: 0,
      missedCount: 0,
    };
  }

  function findPack(packId) {
    return PACKS.find((pack) => pack.id === packId) || PACKS[0];
  }

  function sameCard(a, b) {
    return normalizeText(a && a.thaiText).toLowerCase() === normalizeText(b && b.thaiText).toLowerCase()
      && normalizeText(a && a.meaningText).toLowerCase() === normalizeText(b && b.meaningText).toLowerCase();
  }

  function upsertCard(cards, candidate) {
    const currentCards = Array.isArray(cards) ? cards.slice() : [];
    if (!candidate) return { cards: currentCards, added: false };

    const existingIndex = currentCards.findIndex((card) => sameCard(card, candidate));
    if (existingIndex === -1) {
      return { cards: [candidate, ...currentCards], added: true };
    }

    const existing = currentCards[existingIndex];
    currentCards[existingIndex] = {
      ...existing,
      phonetic: candidate.phonetic || existing.phonetic || "",
      audioBase64: candidate.audioBase64 || existing.audioBase64 || "",
      tag: existing.tag || candidate.tag || "Saved",
      favorite: Boolean(existing.favorite || candidate.favorite),
      updatedAt: candidate.createdAt || Date.now(),
    };
    return { cards: currentCards, added: false };
  }

  function addPack(cards, packId, now) {
    const pack = findPack(packId);
    let currentCards = Array.isArray(cards) ? cards.slice() : [];
    let addedCount = 0;

    pack.cards.forEach((item) => {
      const createdAt = typeof now === "number" ? now : Date.now();
      const result = upsertCard(currentCards, createPackCard(item, pack.id, createdAt));
      if (result.added) addedCount += 1;
      currentCards = result.cards;
    });

    return { cards: currentCards, addedCount, pack };
  }

  function addStarterPack(cards, now) {
    return addPack(cards, "survival-thai", now);
  }

  function getPackSummaries(cards) {
    const currentCards = Array.isArray(cards) ? cards : [];
    return PACKS.map((pack) => {
      const missingCount = pack.cards.filter((item) => {
        const candidate = createPackCard(item, pack.id, 0);
        return !currentCards.some((card) => sameCard(card, candidate));
      }).length;
      return {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        totalCount: pack.cards.length,
        missingCount,
        addedCount: pack.cards.length - missingCount,
      };
    });
  }

  function resetCards() {
    return [];
  }

  function getDueCards(cards, now, category) {
    const dueAt = typeof now === "number" ? now : Date.now();
    return filterCardsByCategory(cards, category)
      .filter((card) => Number(card.dueAt || 0) <= dueAt)
      .slice()
      .sort((a, b) => Number(a.dueAt || 0) - Number(b.dueAt || 0) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
  }

  function nextIntervalDays(knownCount) {
    return INTERVALS[Math.min(Math.max(knownCount - 1, 0), INTERVALS.length - 1)];
  }

  function reviewCard(cards, cardId, remembered, now) {
    const reviewedAt = typeof now === "number" ? now : Date.now();
    const currentCards = Array.isArray(cards) ? cards : [];
    return {
      cards: currentCards.map((card) => {
        if (!card || card.id !== cardId) return card;
        const reviewCount = Number(card.reviewCount || 0) + 1;

        if (!remembered) {
          return {
            ...card,
            reviewCount,
            missedCount: Number(card.missedCount || 0) + 1,
            intervalDays: 0,
            reviewedAt,
            dueAt: reviewedAt + FORGOT_DELAY_MS,
          };
        }

        const knownCount = Number(card.knownCount || 0) + 1;
        const intervalDays = nextIntervalDays(knownCount);
        return {
          ...card,
          reviewCount,
          knownCount,
          intervalDays,
          reviewedAt,
          dueAt: reviewedAt + intervalDays * DAY_MS,
        };
      }),
    };
  }

  function updateCardAudio(cards, cardId, audioBase64) {
    let updated = false;
    const currentCards = Array.isArray(cards) ? cards : [];
    const updatedCards = currentCards.map((card) => {
      if (!card || card.id !== cardId) return card;
      updated = true;
      return {
        ...card,
        audioBase64: audioBase64 ? String(audioBase64) : "",
        updatedAt: Date.now(),
      };
    });
    return { cards: updatedCards, updated };
  }

  function getPhoneticLabel(card) {
    const phonetic = normalizeText(card && card.phonetic);
    return phonetic ? `Phonetically: ${phonetic}` : "";
  }

  function getCategory(card) {
    return normalizeText(card && card.tag) || "Saved";
  }

  function getCategories(cards) {
    const categories = new Set(["All"]);
    if ((Array.isArray(cards) ? cards : []).some((card) => card && card.favorite)) categories.add("Favorites");
    (Array.isArray(cards) ? cards : []).forEach((card) => {
      categories.add(getCategory(card));
    });
    const sorted = Array.from(categories).filter((category) => category !== "All" && category !== "Favorites").sort();
    return ["All"].concat(categories.has("Favorites") ? ["Favorites"] : [], sorted);
  }

  function filterCardsByCategory(cards, category) {
    const currentCards = Array.isArray(cards) ? cards : [];
    if (!category || category === "All") return currentCards.slice();
    if (category === "Favorites") return currentCards.filter((card) => card && card.favorite);
    return currentCards.filter((card) => getCategory(card) === category);
  }

  function getStats(cards, now, category) {
    const currentCards = filterCardsByCategory(cards, category);
    const dueCount = getDueCards(currentCards, now).length;
    return {
      total: currentCards.length,
      due: dueCount,
      learning: currentCards.filter((card) => Number(card.reviewCount || 0) > 0 && Number(card.knownCount || 0) < 4).length,
      mastered: currentCards.filter((card) => Number(card.knownCount || 0) >= 4).length,
    };
  }

  return {
    DAY_MS,
    FORGOT_DELAY_MS,
    PACKS,
    STARTER_PACK,
    createCardFromTranslation,
    addPack,
    addStarterPack,
    getPackSummaries,
    resetCards,
    upsertCard,
    getDueCards,
    reviewCard,
    updateCardAudio,
    getPhoneticLabel,
    getCategory,
    getCategories,
    filterCardsByCategory,
    getStats,
  };
});
