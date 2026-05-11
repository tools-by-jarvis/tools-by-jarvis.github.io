/**
 * guide.js - AI 轉運指引 (Fortune Direction Guide)
 * Cross-references 紫微斗數 + 奇門遁甲 to find optimal direction & timing
 */

const Guide = (() => {
  'use strict';

  // 宮位 → 方位 mapping
  const PALACE_DIRECTION = {
    0: { name: '北', angle: 0, emoji: '⬆️' },      // 坎一宮
    1: { name: '西南', angle: 225, emoji: '↙️' },   // 坤二宮
    2: { name: '東', angle: 90, emoji: '➡️' },      // 震三宮
    3: { name: '東南', angle: 135, emoji: '↗️' },   // 巽四宮
    4: { name: '中', angle: -1, emoji: '⏺️' },     // 中五宮 (不可用)
    5: { name: '西北', angle: 315, emoji: '↖️' },   // 乾六宮
    6: { name: '西', angle: 270, emoji: '⬅️' },     // 兌七宮
    7: { name: '東北', angle: 45, emoji: '↗️' },    // 艮八宮
    8: { name: '南', angle: 180, emoji: '⬇️' },     // 離九宮
  };

  // 吉門
  const JI_MEN = ['開門', '休門', '生門'];
  // 凶門
  const XIONG_MEN = ['死門', '驚門', '傷門'];
  // 吉神
  const JI_SHEN = ['值符', '太陰', '六合', '九天'];
  // 凶神
  const XIONG_SHEN = ['白虎', '玄武', '騰蛇'];
  // 吉星
  const JI_XING = ['天輔', '天心', '天任', '天禽', '天衝'];
  // 凶星
  const XIONG_XING = ['天蓬', '天芮', '天柱'];

  // Concern → preferred door mapping
  const CONCERN_DOOR = {
    '財運': ['生門', '開門', '休門'],
    '事業': ['開門', '生門', '休門'],
    '感情': ['休門', '開門', '生門'],
    '健康': ['休門', '生門', '開門'],
    '學業': ['開門', '杜門', '休門'],
  };

  // Concern → benefit text
  const CONCERN_BENEFITS = {
    '財運': ['財運提升', '貴人相助', '生意興隆'],
    '事業': ['事業開運', '升遷有望', '貴人提拔'],
    '感情': ['桃花運旺', '感情和合', '人緣提升'],
    '健康': ['身體康健', '精神充沛', '病氣消除'],
    '學業': ['思路清晰', '考試順利', '學習效率提升'],
  };

  /**
   * Score a palace for a given concern
   */
  function scorePalace(palace, concern) {
    if (!palace || palace.position === '中') return -999;
    
    let score = 0;
    const preferredDoors = CONCERN_DOOR[concern] || ['開門', '休門', '生門'];

    // Door scoring (most important)
    if (palace.door) {
      const doorIdx = preferredDoors.indexOf(palace.door);
      if (doorIdx === 0) score += 50;
      else if (doorIdx === 1) score += 35;
      else if (doorIdx === 2) score += 25;
      else if (JI_MEN.includes(palace.door)) score += 15;
      else if (palace.door === '景門') score += 5;
      else if (palace.door === '杜門') score += (concern === '學業' ? 40 : 0);
      else if (XIONG_MEN.includes(palace.door)) score -= 30;
    }

    // Deity scoring
    if (palace.deity) {
      if (JI_SHEN.includes(palace.deity)) score += 20;
      if (palace.deity === '值符') score += 10; // extra for 值符
      if (palace.deity === '六合' && concern === '感情') score += 15;
      if (palace.deity === '九天' && concern === '事業') score += 10;
      if (XIONG_SHEN.includes(palace.deity)) score -= 15;
    }

    // Star scoring
    if (palace.star) {
      if (JI_XING.includes(palace.star)) score += 15;
      if (palace.star === '天輔' && concern === '學業') score += 10;
      if (palace.star === '天心' && concern === '健康') score += 10;
      if (palace.star === '天任' && concern === '財運') score += 10;
      if (XIONG_XING.includes(palace.star)) score -= 10;
    }

    return score;
  }

  /**
   * Find the best palace/direction for a concern
   */
  function findBestDirection(qimenResult, concern) {
    const scored = qimenResult.palaces.map((p, i) => ({
      palace: p,
      index: i,
      score: scorePalace(p, concern),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Return best (skip center palace)
    const best = scored.find(s => s.index !== 4);
    const secondBest = scored.find(s => s.index !== 4 && s.index !== best.index);

    return { best, secondBest, allScored: scored };
  }

  /**
   * Get current 時辰 info
   */
  function getCurrentShichen() {
    const now = new Date();
    const h = now.getHours();
    const shiNames = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const shiLabels = [
      '子時 (23:00-01:00)', '丑時 (01:00-03:00)', '寅時 (03:00-05:00)',
      '卯時 (05:00-07:00)', '辰時 (07:00-09:00)', '巳時 (09:00-11:00)',
      '午時 (11:00-13:00)', '未時 (13:00-15:00)', '申時 (15:00-17:00)',
      '酉時 (17:00-19:00)', '戌時 (19:00-21:00)', '亥時 (21:00-23:00)'
    ];
    const shiRanges = [
      '23:00-01:00','01:00-03:00','03:00-05:00','05:00-07:00',
      '07:00-09:00','09:00-11:00','11:00-13:00','13:00-15:00',
      '15:00-17:00','17:00-19:00','19:00-21:00','21:00-23:00'
    ];

    let idx;
    if (h === 23 || h === 0) idx = 0;
    else idx = Math.floor((h + 1) / 2);

    return { index: idx, name: shiNames[idx], label: shiLabels[idx], range: shiRanges[idx] };
  }

  /**
   * Find the best upcoming time period (scan next few 時辰)
   */
  function findBestTimePeriod(year, month, day, concern) {
    const now = new Date();
    const currentHour = now.getHours();
    const results = [];

    // Check current and next 5 時辰
    for (let offset = 0; offset < 6; offset++) {
      let testHour = currentHour + offset * 2;
      let testDay = day;
      let testMonth = month;
      if (testHour >= 24) {
        testHour -= 24;
        testDay++;
        // Simple day overflow (not perfect but good enough)
        const daysInMonth = new Date(year, testMonth, 0).getDate();
        if (testDay > daysInMonth) { testDay = 1; testMonth++; }
      }

      try {
        const qm = QiMen.calculate(year, testMonth, testDay, testHour);
        const best = findBestDirection(qm, concern);
        results.push({
          hour: testHour,
          day: testDay,
          month: testMonth,
          qimenResult: qm,
          bestPalace: best.best,
          score: best.best.score,
          isNow: offset === 0,
        });
      } catch (e) {
        // Skip if calculation fails
      }
    }

    // Sort by score, pick best
    results.sort((a, b) => b.score - a.score);
    return results[0] || null;
  }

  /**
   * Analyze 紫微 weakness for the concern
   */
  function analyzeZiweiWeakness(ziweiResult, concern) {
    const palaceMap = {
      '財運': '財帛',
      '事業': '官祿',
      '感情': '夫妻',
      '健康': '疾厄',
      '學業': '父母', // 父母宮管學業
    };

    const targetPalaceName = palaceMap[concern];
    let targetPalace = null;

    for (let i = 0; i < 12; i++) {
      if (ziweiResult.palaces[i].palaceName === targetPalaceName) {
        targetPalace = ziweiResult.palaces[i];
        break;
      }
    }

    if (!targetPalace) return { text: '命盤分析中...', palace: null };

    const mainStars = targetPalace.stars.filter(s => s.type === 'main');
    const shaStars = targetPalace.stars.filter(s => s.type === 'sha');
    const hasJi = targetPalace.stars.some(s => s.hua.includes('化忌'));
    const hasLu = targetPalace.stars.some(s => s.hua.includes('化祿'));

    let analysis = `你的${targetPalaceName}宮（${targetPalace.ganZhi}）`;
    
    if (mainStars.length === 0) {
      analysis += '無主星坐守，此方面較易受外在環境影響。';
    } else {
      analysis += `有${mainStars.map(s => {
        let txt = s.name;
        if (s.brightness) txt += `(${s.brightness})`;
        if (s.hua.length) txt += s.hua.join('');
        return txt;
      }).join('、')}坐守。`;
    }

    if (hasJi) analysis += '化忌入此宮，此方面需特別注意改善。';
    if (hasLu) analysis += '化祿入此宮，基本格局不差。';
    if (shaStars.length > 0) {
      analysis += `煞星${shaStars.map(s => s.name).join('、')}同宮，需化解不利能量。`;
    }

    // 大限 analysis
    const now = new Date();
    const birthYear = parseInt(ziweiResult.solarDate);
    const age = now.getFullYear() - birthYear;
    let currentDX = null;
    for (let i = 0; i < 12; i++) {
      if (ziweiResult.palaces[i].daXianStart <= age && age <= ziweiResult.palaces[i].daXianEnd) {
        currentDX = ziweiResult.palaces[i];
        break;
      }
    }

    if (currentDX) {
      analysis += `\n目前行${currentDX.palaceName}大限（${currentDX.daXianStart}-${currentDX.daXianEnd}歲）。`;
    }

    return { text: analysis, palace: targetPalace, daXian: currentDX };
  }

  /**
   * Generate full guide result
   */
  function generateGuide(birthYear, birthMonth, birthDay, hourIdx, gender, concern) {
    // 1. Run 紫微斗數
    const ziweiResult = ZiWei.calculate(birthYear, birthMonth, birthDay, hourIdx, gender);
    const ziweiAnalysis = analyzeZiweiWeakness(ziweiResult, concern);

    // 2. Run 奇門遁甲 on current time
    const now = new Date();
    const qimenResult = QiMen.calculate(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours());

    // 3. Find best direction
    const dirResult = findBestDirection(qimenResult, concern);
    const bestPalace = dirResult.best.palace;
    const bestIdx = dirResult.best.index;
    const direction = PALACE_DIRECTION[bestIdx];

    // 4. Get timing info
    const shichen = getCurrentShichen();

    // 5. Build benefits text
    const benefits = CONCERN_BENEFITS[concern] || ['運勢提升', '吉祥如意'];
    
    // Pick 2 benefits based on palace qualities
    let selectedBenefits = [benefits[0]];
    if (bestPalace.deity && JI_SHEN.includes(bestPalace.deity)) {
      if (bestPalace.deity === '六合') selectedBenefits.push('人緣和合');
      else if (bestPalace.deity === '九天') selectedBenefits.push('貴人提拔');
      else if (bestPalace.deity === '太陰') selectedBenefits.push('暗中得助');
      else selectedBenefits.push(benefits[1]);
    } else {
      selectedBenefits.push(benefits[1]);
    }

    // 6. Qimen analysis text
    let qimenText = `當前時盤（${qimenResult.hourPillar}時）`;
    qimenText += `\n${bestPalace.name}（${direction.name}方）：`;
    if (bestPalace.door) qimenText += `${bestPalace.door}`;
    if (bestPalace.star) qimenText += `、${bestPalace.star}`;
    if (bestPalace.deity) qimenText += `、${bestPalace.deity}`;
    qimenText += `\n地盤：${bestPalace.diGan}　天盤：${bestPalace.tianGan}`;
    
    if (dirResult.best.score >= 40) {
      qimenText += '\n此宮吉門吉神齊聚，為當前最佳方位。';
    } else if (dirResult.best.score >= 20) {
      qimenText += '\n此宮吉象較佳，適合前往。';
    } else {
      qimenText += '\n當前時盤吉凶參半，建議靜心前往即可。';
    }

    // 7. Notes based on concern
    const notes = [
      `面朝${direction.name}方靜坐或緩步行走`,
      '心中默想你想達成的目標',
      '保持心境平和，避免使用手機',
      '深呼吸，感受天地之氣',
    ];

    if (concern === '健康') notes.push('可配合簡單伸展運動');
    if (concern === '財運') notes.push('可隨身攜帶少許現金，象徵招財');
    if (concern === '感情') notes.push('可穿著粉色或紅色系衣物');
    if (concern === '事業') notes.push('可攜帶名片或工作相關物品');
    if (concern === '學業') notes.push('可攜帶書本或筆記');

    return {
      direction: direction,
      palaceIndex: bestIdx,
      palaceName: bestPalace.name,
      door: bestPalace.door,
      star: bestPalace.star,
      deity: bestPalace.deity,
      score: dirResult.best.score,
      shichen: shichen,
      benefits: selectedBenefits,
      notes: notes,
      ziweiAnalysis: ziweiAnalysis.text,
      qimenAnalysis: qimenText,
      ziweiResult: ziweiResult,
      qimenResult: qimenResult,
      concern: concern,
      secondBest: dirResult.secondBest ? {
        direction: PALACE_DIRECTION[dirResult.secondBest.index],
        palace: dirResult.secondBest.palace,
      } : null,
    };
  }

  return {
    generateGuide,
    findBestDirection,
    scorePalace,
    getCurrentShichen,
    PALACE_DIRECTION,
    CONCERN_BENEFITS,
  };
})();
