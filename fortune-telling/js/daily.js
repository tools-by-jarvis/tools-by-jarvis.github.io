/**
 * daily.js - 每日運勢生成器
 */

const DailyFortune = (() => {
  const ZODIAC_SIGNS = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'];
  const WESTERN_SIGNS = ['牡羊座','金牛座','雙子座','巨蟹座','獅子座','處女座','天秤座','天蠍座','射手座','摩羯座','水瓶座','雙魚座'];
  const ZODIAC_EMOJI = ['🐀','🐂','🐅','🐇','🐉','🐍','🐴','🐏','🐵','🐔','🐕','🐖'];
  const WESTERN_EMOJI = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

  const FORTUNE_ASPECTS = ['整體運勢','愛情運','事業運','財運','健康運'];

  // Seed-based pseudo-random for daily consistency
  function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getDaySeed(dateStr, signIndex, type) {
    let hash = 0;
    const str = dateStr + signIndex + type;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // Fortune text templates
  const OVERALL_GOOD = [
    '今日運勢大好，諸事順遂，適合開展新計劃。',
    '貴人運旺盛，遇到困難會有人伸出援手。',
    '正能量滿滿的一天，做什麼都特別順手。',
    '今天適合做重要決定，直覺特別準確。',
    '好運連連，把握時機大膽前進。',
  ];
  const OVERALL_MED = [
    '運勢平穩，按部就班即可，不宜冒進。',
    '今日宜守不宜攻，穩定中求發展。',
    '普通的一天，做好本分工作即可。',
    '小心行事，注意細節可避免小麻煩。',
    '平淡中見真章，踏實做事會有收穫。',
  ];
  const OVERALL_LOW = [
    '今日運勢稍弱，凡事多忍讓為宜。',
    '容易遇到小阻礙，保持耐心很重要。',
    '不宜做重大決定，多聽取他人意見。',
    '注意情緒管理，避免與人發生衝突。',
    '韜光養晦的一天，蓄勢待發。',
  ];

  const LOVE_TEXTS = [
    '桃花運不錯，單身者有機會遇到心儀對象。有伴者感情甜蜜。',
    '感情平穩，適合與伴侶共度安靜時光。單身者不宜急躁。',
    '溝通是今日感情關鍵，多表達心意會有驚喜。',
    '感情方面需要多一些耐心，避免因小事爭吵。',
    '異性緣旺盛，社交場合會有好的邂逅機會。',
    '今日適合告白或表達心意，成功率較高。',
    '感情中注意給對方空間，太黏會適得其反。',
  ];
  const CAREER_TEXTS = [
    '工作效率高，適合處理重要專案，容易獲得上司認可。',
    '團隊合作順利，同事間配合默契，進度超前。',
    '職場上可能面臨小挑戰，冷靜應對即可化解。',
    '適合學習新技能或參加培訓，對未來發展有利。',
    '今日思路清晰，適合做規劃和策略性思考。',
    '注意職場人際關係，避免捲入是非。',
    '有升遷或加薪的好消息可能出現。',
  ];
  const WEALTH_TEXTS = [
    '財運亨通，投資有利，但不宜過於貪心。',
    '正財運佳，工作收入穩定增長。偏財運一般。',
    '今日不宜大額消費或投資，守財為上。',
    '有意外之財的可能，留意身邊的機會。',
    '理財方面宜保守，避免高風險操作。',
    '朋友可能帶來賺錢的訊息，值得關注。',
    '財運平穩，適合做長期理財規劃。',
  ];
  const HEALTH_TEXTS = [
    '身體狀態良好，精力充沛，適合運動健身。',
    '注意飲食均衡，避免過度勞累。多喝水。',
    '今日容易感到疲倦，需要充足的休息。',
    '適合做戶外活動，呼吸新鮮空氣有益身心。',
    '注意保暖，預防感冒。作息要規律。',
    '心理壓力可能較大，適合冥想或瑜伽放鬆。',
    '身體微恙，不要硬撐，該休息就休息。',
  ];

  const LUCKY_COLORS = ['紅色','橙色','黃色','綠色','藍色','紫色','白色','粉色','金色','黑色'];
  const LUCKY_NUMBERS = ['1','2','3','5','6','7','8','9'];
  const LUCKY_DIRECTIONS = ['東','南','西','北','東南','東北','西南','西北'];

  /**
   * Generate daily fortune for a zodiac sign
   */
  function generate(signIndex, type, date) {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    const seed = getDaySeed(dateStr, signIndex, type);

    // Star rating (1-5) for each aspect
    const ratings = FORTUNE_ASPECTS.map((_, i) => {
      const r = seededRandom(seed + i * 137);
      return Math.floor(r * 5) + 1;
    });

    const overallRating = ratings[0];
    const overallPool = overallRating >= 4 ? OVERALL_GOOD : overallRating >= 3 ? OVERALL_MED : OVERALL_LOW;

    const pick = (arr, offset) => arr[Math.floor(seededRandom(seed + offset) * arr.length)];

    const fortune = {
      sign: type === 'chinese' ? ZODIAC_SIGNS[signIndex] : WESTERN_SIGNS[signIndex],
      emoji: type === 'chinese' ? ZODIAC_EMOJI[signIndex] : WESTERN_EMOJI[signIndex],
      date: dateStr,
      ratings,
      aspects: [
        { name: '整體運勢', stars: ratings[0], text: pick(overallPool, 100) },
        { name: '愛情運', stars: ratings[1], text: pick(LOVE_TEXTS, 200) },
        { name: '事業運', stars: ratings[2], text: pick(CAREER_TEXTS, 300) },
        { name: '財運', stars: ratings[3], text: pick(WEALTH_TEXTS, 400) },
        { name: '健康運', stars: ratings[4], text: pick(HEALTH_TEXTS, 500) },
      ],
      luckyColor: pick(LUCKY_COLORS, 600),
      luckyNumber: pick(LUCKY_NUMBERS, 700),
      luckyDirection: pick(LUCKY_DIRECTIONS, 800),
    };

    return fortune;
  }

  return { generate, ZODIAC_SIGNS, WESTERN_SIGNS, ZODIAC_EMOJI, WESTERN_EMOJI };
})();
