/**
 * bazi.js - 八字排盤引擎
 */

const BaZi = (() => {
  /**
   * Main calculation entry point
   */
  function calculate(year, month, day, hour, gender) {
    const yp = Lunar.yearPillar(year, month, day, hour);
    const mp = Lunar.monthPillar(year, month, day, hour, yp.ganIdx);
    const dp = Lunar.dayPillar(year, month, day);

    // Handle 子時 (23:00) - day may advance for early 子時
    let adjustedHour = hour;
    const hp = Lunar.hourPillar(adjustedHour, dp.ganIdx);

    const pillars = [yp, mp, dp, hp];

    // Five elements count
    const wuxing = Lunar.countWuXing(pillars);

    // Day Master
    const dayMaster = Lunar.TIAN_GAN[dp.ganIdx];
    const dayMasterWx = Lunar.ganWuXing(dp.ganIdx);

    // Day Master strength analysis
    const strength = analyzeDayMasterStrength(dp.ganIdx, pillars, wuxing);

    // Ten Gods for each pillar
    const tenGods = pillars.map(p => Lunar.tenGod(dp.ganIdx, p.ganIdx));

    // 藏干 and their ten gods
    const hiddenStems = pillars.map(p => {
      const cg = Lunar.zhiCangGan(p.zhiIdx);
      return cg.map(g => {
        const gIdx = Lunar.TIAN_GAN.indexOf(g);
        return { gan: g, tenGod: Lunar.tenGod(dp.ganIdx, gIdx), wuxing: Lunar.ganWuXing(gIdx) };
      });
    });

    // 納音
    const naYins = pillars.map(p => Lunar.naYin(p.ganIdx, p.zhiIdx));

    // 用神 analysis
    const yongShen = analyzeYongShen(dp.ganIdx, wuxing, strength);

    // 大運 calculation
    const daYun = calculateDaYun(year, month, day, hour, gender, yp.ganIdx, mp);

    // Interpretation
    const interpretation = generateInterpretation(dp.ganIdx, wuxing, strength, tenGods, hiddenStems, gender);

    return {
      pillars, wuxing, dayMaster, dayMasterWx,
      strength, tenGods, hiddenStems, naYins,
      yongShen, daYun, interpretation,
      zodiac: Lunar.SHENG_XIAO[pillars[0].zhiIdx],
      shiChen: Lunar.shiChenName(hour)
    };
  }

  /**
   * Analyze Day Master strength
   */
  function analyzeDayMasterStrength(dayGanIdx, pillars, wuxing) {
    const dayWx = Lunar.GAN_WUXING[dayGanIdx];
    const wxOrder = ['木','火','土','金','水'];
    const dayWxIdx = wxOrder.indexOf(dayWx);
    const parentWx = wxOrder[(dayWxIdx + 4) % 5]; // 生我者

    // Count supporting elements (same + parent)
    const support = wuxing[dayWx] + wuxing[parentWx];
    // Count opposing elements (child + wealth + killer)
    const oppose = 8 - support;

    // Check month support (月令)
    const monthZhiWx = Lunar.zhiWuXing(pillars[1].zhiIdx);
    const monthSupport = monthZhiWx === dayWx || monthZhiWx === parentWx;

    let level;
    if (support >= 5 || (support >= 4 && monthSupport)) {
      level = '旺';
    } else if (support >= 4 || (support >= 3 && monthSupport)) {
      level = '偏旺';
    } else if (support <= 2 && !monthSupport) {
      level = '弱';
    } else if (support <= 3 && !monthSupport) {
      level = '偏弱';
    } else {
      level = '中和';
    }

    return {
      level,
      support,
      oppose,
      monthSupport,
      dayWx,
      parentWx,
      description: `日主${dayWx}（${Lunar.TIAN_GAN[dayGanIdx]}），${monthSupport ? '得月令' : '不得月令'}，整體${level}。`
    };
  }

  /**
   * Analyze 用神 (Useful God)
   */
  function analyzeYongShen(dayGanIdx, wuxing, strength) {
    const dayWx = Lunar.GAN_WUXING[dayGanIdx];
    const wxOrder = ['木','火','土','金','水'];
    const dayWxIdx = wxOrder.indexOf(dayWx);

    let yongShen, xiShen, jiShen;

    if (strength.level === '旺' || strength.level === '偏旺') {
      // Day master too strong: need to weaken
      // 用神: 克我(official) or 我生(food/wealth) or 我克(wealth)
      const childWx = wxOrder[(dayWxIdx + 1) % 5]; // 我生 (食傷)
      const wealthWx = wxOrder[(dayWxIdx + 2) % 5]; // 我克 (財)
      const killerWx = wxOrder[(dayWxIdx + 3) % 5]; // 克我 (官殺)

      // Pick the one most needed
      if (wuxing[wealthWx] <= 1) {
        yongShen = wealthWx;
        xiShen = childWx;
      } else if (wuxing[killerWx] <= 1) {
        yongShen = killerWx;
        xiShen = wealthWx;
      } else {
        yongShen = childWx;
        xiShen = wealthWx;
      }
      jiShen = dayWx; // 忌同類
    } else if (strength.level === '弱' || strength.level === '偏弱') {
      // Day master too weak: need to strengthen
      const parentWx = wxOrder[(dayWxIdx + 4) % 5]; // 生我 (印)

      if (wuxing[parentWx] <= 1) {
        yongShen = parentWx;
        xiShen = dayWx;
      } else {
        yongShen = dayWx;
        xiShen = parentWx;
      }
      jiShen = wxOrder[(dayWxIdx + 3) % 5]; // 忌官殺
    } else {
      // Balanced: maintain balance
      const parentWx = wxOrder[(dayWxIdx + 4) % 5];
      yongShen = parentWx;
      xiShen = dayWx;
      jiShen = wxOrder[(dayWxIdx + 3) % 5];
    }

    return {
      yongShen,
      xiShen,
      jiShen,
      description: `用神：${yongShen}　喜神：${xiShen}　忌神：${jiShen}`
    };
  }

  /**
   * Calculate 大運 (Major Luck Cycles)
   */
  function calculateDaYun(year, month, day, hour, gender, yearGanIdx, mp) {
    // Direction: 陽男陰女 forward, 陰男陽女 backward
    const yearYinYang = yearGanIdx % 2; // 0=陽, 1=陰
    const isMale = gender === '男';
    const forward = (yearYinYang === 0 && isMale) || (yearYinYang === 1 && !isMale);

    // Starting age (simplified: typically 1-9 based on birth proximity to nearest solar term)
    // Simplified calculation: count days to next/prev 節氣, divide by 3 = starting age
    const startAge = calculateStartAge(year, month, day, hour, forward);

    // Generate 8 大運 periods
    const daYunList = [];
    let currentGanIdx = mp.ganIdx;
    let currentZhiIdx = mp.zhiIdx;

    for (let i = 0; i < 8; i++) {
      if (forward) {
        currentGanIdx = (currentGanIdx + 1) % 10;
        currentZhiIdx = (currentZhiIdx + 1) % 12;
      } else {
        currentGanIdx = (currentGanIdx + 9) % 10;
        currentZhiIdx = (currentZhiIdx + 11) % 12;
      }

      const age = startAge + i * 10;
      const calYear = year + age;

      daYunList.push({
        ganIdx: currentGanIdx,
        zhiIdx: currentZhiIdx,
        text: Lunar.TIAN_GAN[currentGanIdx] + Lunar.DI_ZHI[currentZhiIdx],
        startAge: age,
        endAge: age + 9,
        startYear: calYear,
        wuxing: Lunar.ganWuXing(currentGanIdx) + Lunar.zhiWuXing(currentZhiIdx)
      });
    }

    return { forward, startAge, list: daYunList };
  }

  function calculateStartAge(year, month, day, hour, forward) {
    const dt = new Date(year, month - 1, day, hour);
    const bounds = Lunar.getMonthBoundaries(year);
    const nextBounds = Lunar.getMonthBoundaries(year + 1);
    const prevBounds = Lunar.getMonthBoundaries(year - 1);
    const allBounds = [...prevBounds, ...bounds, ...nextBounds].sort((a, b) => a.date - b.date);

    let target;
    if (forward) {
      // Find next 節
      target = allBounds.find(b => b.date > dt);
    } else {
      // Find previous 節
      for (let i = allBounds.length - 1; i >= 0; i--) {
        if (allBounds[i].date < dt) { target = allBounds[i]; break; }
      }
    }
    if (!target) return 3;

    const daysDiff = Math.abs(target.date - dt) / (24 * 3600 * 1000);
    const age = Math.round(daysDiff / 3);
    return Math.max(1, Math.min(age, 9));
  }

  /**
   * Generate interpretation text
   */
  function generateInterpretation(dayGanIdx, wuxing, strength, tenGods, hiddenStems, gender) {
    const dayGan = Lunar.TIAN_GAN[dayGanIdx];
    const dayWx = Lunar.GAN_WUXING[dayGanIdx];
    const isMale = gender === '男';

    // Personality based on Day Master
    const personalityMap = {
      '甲': '如大樹般正直挺拔，有領導氣質，重仁義。個性剛直，有主見，但有時過於固執。適合開創性的工作。',
      '乙': '如花草般柔韌靈活，善於適應環境，溫柔細膩。有藝術天賦，善於交際，但有時優柔寡斷。',
      '丙': '如太陽般光明磊落，熱情開朗，充滿活力。做事積極主動，有感召力，但有時過於衝動。',
      '丁': '如燭火般溫暖細緻，思慮周密，內心豐富。善於觀察，有洞察力，但有時多慮。',
      '戊': '如大山般穩重可靠，寬厚包容，值得信賴。做事踏實，有耐心，但有時反應較慢。',
      '己': '如田園般溫順謙和，善於滋養他人，細心周到。適應力強，但有時缺乏自信。',
      '庚': '如寶劍般剛毅果決，行動力強，重義氣。做事果斷利落，但有時過於嚴厲。',
      '辛': '如珠寶般精緻敏銳，品味高雅，追求完美。心思細膩，有審美眼光，但有時過於挑剔。',
      '壬': '如大海般智慧深沉，思想開闊，善於謀略。學習力強，變通能力好，但有時缺乏毅力。',
      '癸': '如雨露般聰慧靈巧，直覺敏銳，善解人意。想像力豐富，有靈性，但有時過於敏感。',
    };

    // Career based on strongest elements and ten gods
    const careerAdvice = generateCareerAdvice(dayWx, wuxing, tenGods, strength);

    // Wealth analysis
    const wealthAdvice = generateWealthAdvice(dayWx, wuxing, strength);

    // Relationship analysis
    const relationAdvice = generateRelationAdvice(dayGanIdx, wuxing, strength, isMale);

    return {
      personality: personalityMap[dayGan] || '',
      career: careerAdvice,
      wealth: wealthAdvice,
      relationship: relationAdvice
    };
  }

  function generateCareerAdvice(dayWx, wuxing, tenGods, strength) {
    const wxCareer = {
      '木': '適合教育、文化、出版、醫療、園藝、服裝設計等行業。',
      '火': '適合科技、電子、能源、娛樂、餐飲、傳媒等行業。',
      '土': '適合房地產、建築、農業、金融、管理、諮詢等行業。',
      '金': '適合金融、法律、軍警、機械、IT、工程等行業。',
      '水': '適合物流、旅遊、貿易、水利、航運、傳播等行業。'
    };

    let advice = wxCareer[dayWx] || '';
    if (strength.level === '旺' || strength.level === '偏旺') {
      advice += '日主偏旺，適合自主創業或管理崗位，有領導潛力。';
    } else if (strength.level === '弱' || strength.level === '偏弱') {
      advice += '日主偏弱，適合穩定的職業環境，與人合作會更有成就。';
    }
    return advice;
  }

  function generateWealthAdvice(dayWx, wuxing, strength) {
    const wxOrder = ['木','火','土','金','水'];
    const dayIdx = wxOrder.indexOf(dayWx);
    const wealthWx = wxOrder[(dayIdx + 2) % 5];
    const wealthCount = wuxing[wealthWx];

    if (wealthCount >= 3) {
      return '八字中財星旺盛，一生財運不錯，但需注意理財，避免因貪而失。適合正當投資，穩健增長。';
    } else if (wealthCount >= 2) {
      return '財運中等偏上，通過努力工作能獲得穩定收入。中年後財運漸佳，宜積累為主。';
    } else if (wealthCount >= 1) {
      return '財運平穩，不宜投機冒險。適合固定薪資或技術性工作，靠專業能力積累財富。';
    } else {
      return '八字中財星較弱，需更加努力才能獲得財富。建議學習理財知識，多元化收入來源。';
    }
  }

  function generateRelationAdvice(dayGanIdx, wuxing, strength, isMale) {
    const dayWx = Lunar.GAN_WUXING[dayGanIdx];
    const wxOrder = ['木','火','土','金','水'];
    const dayIdx = wxOrder.indexOf(dayWx);

    // For males: 財=wife, for females: 官=husband
    const spouseWx = isMale ? wxOrder[(dayIdx + 2) % 5] : wxOrder[(dayIdx + 3) % 5];
    const spouseCount = wuxing[spouseWx];

    let advice = '';
    if (isMale) {
      if (spouseCount >= 2) {
        advice = '感情運勢不錯，異性緣佳。婚姻中宜多包容，互相尊重，感情可長久穩定。';
      } else if (spouseCount >= 1) {
        advice = '感情運勢平穩，婚姻生活和諧。晚婚可能更好，找到志同道合的伴侶最重要。';
      } else {
        advice = '感情方面需多努力經營，不宜急於求成。建議先充實自己，緣分自然到來。';
      }
    } else {
      if (spouseCount >= 2) {
        advice = '感情運勢佳，容易遇到好對象。婚後生活幸福，但需注意保持自我獨立。';
      } else if (spouseCount >= 1) {
        advice = '感情運勢平穩，適合找穩重可靠的伴侶。婚姻中溝通是關鍵。';
      } else {
        advice = '感情方面較為淡薄，可能晚婚。建議拓展社交圈，主動一些會有好結果。';
      }
    }
    return advice;
  }

  return { calculate };
})();
