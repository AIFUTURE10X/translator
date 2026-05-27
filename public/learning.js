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
    {
      id: "food-drinks-1",
      name: "Food and Drinks 1",
      description: "Restaurant, cafe, and street-food phrases.",
      cards: [
        { thaiText: "ขอเมนู", meaningText: "Can I have the menu?", phonetic: "khor meh-nuu", tag: "Food" },
        { thaiText: "เอาเผ็ดน้อย", meaningText: "Make it a little spicy", phonetic: "ao phet noi", tag: "Food" },
        { thaiText: "ไม่ใส่น้ำแข็ง", meaningText: "No ice", phonetic: "mai sai naam khaeng", tag: "Food" },
        { thaiText: "หวานน้อย", meaningText: "Less sweet", phonetic: "waan noi", tag: "Food" },
        { thaiText: "เอากลับบ้าน", meaningText: "Takeaway / to go", phonetic: "ao glap baan", tag: "Food" },
        { thaiText: "กินที่นี่", meaningText: "Eat here", phonetic: "gin tee nee", tag: "Food" },
        { thaiText: "ขอช้อนส้อม", meaningText: "Can I have a spoon and fork?", phonetic: "khor chon som", tag: "Food" },
        { thaiText: "มีอาหารเจไหม", meaningText: "Do you have vegetarian food?", phonetic: "mee aa-haan jay mai", tag: "Food" },
        { thaiText: "ไม่กินหมู", meaningText: "I do not eat pork", phonetic: "mai gin muu", tag: "Food" },
        { thaiText: "ไม่ใส่ผงชูรส", meaningText: "No MSG", phonetic: "mai sai phong chuu rot", tag: "Food" },
        { thaiText: "ข้าวผัด", meaningText: "Fried rice", phonetic: "khao phat", tag: "Food" },
        { thaiText: "ผัดไทย", meaningText: "Pad Thai", phonetic: "phat thai", tag: "Food" },
        { thaiText: "ต้มยำกุ้ง", meaningText: "Tom yum soup with shrimp", phonetic: "dtom yam goong", tag: "Food" },
        { thaiText: "อร่อยไหม", meaningText: "Is it tasty?", phonetic: "a-roi mai", tag: "Food" },
        { thaiText: "ขออีกหนึ่ง", meaningText: "One more, please", phonetic: "khor eek neung", tag: "Food" },
      ],
    },
    {
      id: "transport-taxi-1",
      name: "Transport and Taxi 1",
      description: "Taxi, airport, traffic, and getting around.",
      cards: [
        { thaiText: "ไปสนามบิน", meaningText: "Go to the airport", phonetic: "bpai sa-naam bin", tag: "Transport" },
        { thaiText: "ไปโรงแรมนี้", meaningText: "Go to this hotel", phonetic: "bpai rong-raem nee", tag: "Transport" },
        { thaiText: "เปิดมิเตอร์ด้วย", meaningText: "Please use the meter", phonetic: "bpert mee-dter duay", tag: "Transport" },
        { thaiText: "ค่าโดยสารเท่าไหร่", meaningText: "How much is the fare?", phonetic: "khaa doi-saan tao-rai", tag: "Transport" },
        { thaiText: "อีกไกลไหม", meaningText: "Is it much farther?", phonetic: "eek glai mai", tag: "Transport" },
        { thaiText: "ใช้เวลานานไหม", meaningText: "Will it take long?", phonetic: "chai weh-laa naan mai", tag: "Transport" },
        { thaiText: "รถติด", meaningText: "Traffic jam", phonetic: "rot dtit", tag: "Transport" },
        { thaiText: "รอแป๊บ", meaningText: "Wait a moment", phonetic: "ror bpaep", tag: "Transport" },
        { thaiText: "ลงตรงนี้", meaningText: "I will get out here", phonetic: "long dtrong nee", tag: "Transport" },
        { thaiText: "กลับรถได้ไหม", meaningText: "Can you turn around?", phonetic: "glap rot dai mai", tag: "Transport" },
        { thaiText: "สถานีรถไฟอยู่ที่ไหน", meaningText: "Where is the train station?", phonetic: "sa-thaa-nee rot-fai yoo tee nai", tag: "Transport" },
        { thaiText: "ป้ายรถเมล์อยู่ที่ไหน", meaningText: "Where is the bus stop?", phonetic: "bpaai rot-may yoo tee nai", tag: "Transport" },
        { thaiText: "ใกล้ไหม", meaningText: "Is it nearby?", phonetic: "glai mai", tag: "Transport" },
        { thaiText: "ไกลมากไหม", meaningText: "Is it very far?", phonetic: "glai maak mai", tag: "Transport" },
        { thaiText: "ถึงแล้ว", meaningText: "We have arrived", phonetic: "theung laew", tag: "Transport" },
      ],
    },
    {
      id: "hotel-stay-1",
      name: "Hotel Stay 1",
      description: "Checking in, room problems, and hotel requests.",
      cards: [
        { thaiText: "เช็คอินได้ไหม", meaningText: "Can I check in?", phonetic: "chek in dai mai", tag: "Hotel" },
        { thaiText: "เช็คเอาท์กี่โมง", meaningText: "What time is checkout?", phonetic: "chek ao gee mong", tag: "Hotel" },
        { thaiText: "จองไว้แล้ว", meaningText: "I already have a booking", phonetic: "jong wai laew", tag: "Hotel" },
        { thaiText: "มีห้องว่างไหม", meaningText: "Do you have a room available?", phonetic: "mee hong waang mai", tag: "Hotel" },
        { thaiText: "รหัสไวไฟคืออะไร", meaningText: "What is the Wi-Fi password?", phonetic: "ra-hat wai-fai kheu a-rai", tag: "Hotel" },
        { thaiText: "แอร์ไม่เย็น", meaningText: "The air conditioner is not cold", phonetic: "air mai yen", tag: "Hotel" },
        { thaiText: "น้ำไม่ไหล", meaningText: "The water is not running", phonetic: "naam mai lai", tag: "Hotel" },
        { thaiText: "ห้องเสียงดัง", meaningText: "The room is noisy", phonetic: "hong siang dang", tag: "Hotel" },
        { thaiText: "ขอผ้าเช็ดตัวเพิ่ม", meaningText: "Can I have more towels?", phonetic: "khor phaa chet dtua perm", tag: "Hotel" },
        { thaiText: "ทำความสะอาดห้อง", meaningText: "Please clean the room", phonetic: "tham khwaam sa-aat hong", tag: "Hotel" },
        { thaiText: "ฝากกระเป๋าได้ไหม", meaningText: "Can I leave my bags?", phonetic: "faak gra-bpao dai mai", tag: "Hotel" },
        { thaiText: "ปลุกตอนเจ็ดโมง", meaningText: "Wake me at seven", phonetic: "bpluk dton jet mong", tag: "Hotel" },
        { thaiText: "ที่จอดรถอยู่ที่ไหน", meaningText: "Where is the parking?", phonetic: "tee jot rot yoo tee nai", tag: "Hotel" },
        { thaiText: "ขอกุญแจอีกดอก", meaningText: "Can I have another key?", phonetic: "khor gun-jae eek dok", tag: "Hotel" },
        { thaiText: "ขอเปลี่ยนห้อง", meaningText: "Can I change rooms?", phonetic: "khor bplian hong", tag: "Hotel" },
      ],
    },
    {
      id: "health-emergency-1",
      name: "Health and Emergency 1",
      description: "Health, safety, and urgent-help phrases.",
      cards: [
        { thaiText: "เจ็บตรงนี้", meaningText: "It hurts here", phonetic: "jep dtrong nee", tag: "Health" },
        { thaiText: "ปวดหัว", meaningText: "I have a headache", phonetic: "bpuat hua", tag: "Health" },
        { thaiText: "ปวดท้อง", meaningText: "I have a stomachache", phonetic: "bpuat tong", tag: "Health" },
        { thaiText: "เป็นไข้", meaningText: "I have a fever", phonetic: "bpen khai", tag: "Health" },
        { thaiText: "แพ้ยา", meaningText: "I am allergic to medicine", phonetic: "phae yaa", tag: "Health" },
        { thaiText: "ต้องไปโรงพยาบาล", meaningText: "I need to go to the hospital", phonetic: "dtong bpai rong pha-yaa-baan", tag: "Health" },
        { thaiText: "เรียกรถพยาบาล", meaningText: "Call an ambulance", phonetic: "riak rot pha-yaa-baan", tag: "Emergency" },
        { thaiText: "ตำรวจ", meaningText: "Police", phonetic: "dtam-ruat", tag: "Emergency" },
        { thaiText: "ช่วยโทรหาตำรวจ", meaningText: "Please call the police", phonetic: "chuay toh haa dtam-ruat", tag: "Emergency" },
        { thaiText: "ของหาย", meaningText: "My things are missing", phonetic: "khong haai", tag: "Emergency" },
        { thaiText: "กระเป๋าหาย", meaningText: "My bag is missing", phonetic: "gra-bpao haai", tag: "Emergency" },
        { thaiText: "อันตราย", meaningText: "Dangerous", phonetic: "an-dta-raai", tag: "Emergency" },
        { thaiText: "ไฟไหม้", meaningText: "Fire", phonetic: "fai mai", tag: "Emergency" },
        { thaiText: "ฉันหลงทาง", meaningText: "I am lost", phonetic: "chan long thaang", tag: "Emergency" },
        { thaiText: "ต้องการความช่วยเหลือ", meaningText: "I need help", phonetic: "dtong gaan khwaam chuay leua", tag: "Emergency" },
      ],
    },
    {
      id: "shopping-market-1",
      name: "Shopping and Market 1",
      description: "Markets, sizes, colors, payment, and receipts.",
      cards: [
        { thaiText: "มีไซซ์ใหญ่ไหม", meaningText: "Do you have a larger size?", phonetic: "mee sai yai mai", tag: "Shopping" },
        { thaiText: "มีไซซ์เล็กไหม", meaningText: "Do you have a smaller size?", phonetic: "mee sai lek mai", tag: "Shopping" },
        { thaiText: "มีสีอื่นไหม", meaningText: "Do you have another color?", phonetic: "mee sii eun mai", tag: "Shopping" },
        { thaiText: "ลองได้ไหม", meaningText: "Can I try it?", phonetic: "long dai mai", tag: "Shopping" },
        { thaiText: "จ่ายด้วยบัตรได้ไหม", meaningText: "Can I pay by card?", phonetic: "jaai duay bat dai mai", tag: "Shopping" },
        { thaiText: "รับเงินสดไหม", meaningText: "Do you take cash?", phonetic: "rap ngoen sot mai", tag: "Shopping" },
        { thaiText: "ถูกกว่านี้ได้ไหม", meaningText: "Can it be cheaper?", phonetic: "thuuk gwaa nee dai mai", tag: "Shopping" },
        { thaiText: "ขอใบเสร็จ", meaningText: "Can I have a receipt?", phonetic: "khor bai set", tag: "Shopping" },
        { thaiText: "เปิดกี่โมง", meaningText: "What time do you open?", phonetic: "bpert gee mong", tag: "Shopping" },
        { thaiText: "ปิดกี่โมง", meaningText: "What time do you close?", phonetic: "bpit gee mong", tag: "Shopping" },
        { thaiText: "อยู่ตรงไหน", meaningText: "Where is it?", phonetic: "yoo dtrong nai", tag: "Shopping" },
        { thaiText: "ของแท้ไหม", meaningText: "Is it genuine?", phonetic: "khong thae mai", tag: "Shopping" },
        { thaiText: "สองอันเท่าไหร่", meaningText: "How much for two?", phonetic: "song an tao-rai", tag: "Shopping" },
        { thaiText: "เอาถุงด้วย", meaningText: "I need a bag", phonetic: "ao thoong duay", tag: "Shopping" },
        { thaiText: "ไม่เอาถุง", meaningText: "No bag", phonetic: "mai ao thoong", tag: "Shopping" },
      ],
    },
    {
      id: "social-basics-1",
      name: "Social Basics 1",
      description: "Names, polite phrases, dates, and friendly conversation.",
      cards: [
        { thaiText: "คุณชื่ออะไร", meaningText: "What is your name?", phonetic: "khun cheu a-rai", tag: "Social" },
        { thaiText: "ฉันชื่อฟิล", meaningText: "My name is Phil", phonetic: "chan cheu Phil", tag: "Social" },
        { thaiText: "ยินดีที่ได้รู้จัก", meaningText: "Nice to meet you", phonetic: "yin-dee tee dai roo-jak", tag: "Social" },
        { thaiText: "สบายดีไหม", meaningText: "How are you?", phonetic: "sa-baai dee mai", tag: "Social" },
        { thaiText: "สบายดี", meaningText: "I am fine", phonetic: "sa-baai dee", tag: "Social" },
        { thaiText: "ไม่เป็นไร", meaningText: "No problem / never mind", phonetic: "mai bpen rai", tag: "Basics" },
        { thaiText: "กรุณา", meaningText: "Please", phonetic: "ga-ru-naa", tag: "Basics" },
        { thaiText: "ขออีกครั้ง", meaningText: "One more time, please", phonetic: "khor eek khrang", tag: "Basics" },
        { thaiText: "ชอบมาก", meaningText: "I like it a lot", phonetic: "chop maak", tag: "Social" },
        { thaiText: "สวยมาก", meaningText: "Very beautiful", phonetic: "suay maak", tag: "Social" },
        { thaiText: "ดีมาก", meaningText: "Very good", phonetic: "dee maak", tag: "Social" },
        { thaiText: "วันนี้", meaningText: "Today", phonetic: "wan nee", tag: "Time" },
        { thaiText: "พรุ่งนี้", meaningText: "Tomorrow", phonetic: "phrung nee", tag: "Time" },
        { thaiText: "เมื่อวาน", meaningText: "Yesterday", phonetic: "meua waan", tag: "Time" },
        { thaiText: "แล้วเจอกัน", meaningText: "See you later", phonetic: "laew jer gan", tag: "Social" },
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

  function getAvailableCategories(cards) {
    const categories = new Set(getCategories(cards));
    PACKS.forEach((pack) => {
      pack.cards.forEach((card) => categories.add(getCategory(card)));
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
    getAvailableCategories,
    filterCardsByCategory,
    getStats,
  };
});
