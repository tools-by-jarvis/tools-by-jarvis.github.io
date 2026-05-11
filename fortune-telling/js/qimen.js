/**
 * qimen.js - 奇門遁甲排盤引擎 (時家奇門)
 */

const QiMen = (() => {
  // 九星
  const STARS = ['天蓬','天芮','天衝','天輔','天禽','天心','天柱','天任','天英'];
  // 原始宮位: 蓬1, 芮2, 衝3, 輔4, 禽5, 心6, 柱7, 任8, 英9
  const STAR_PALACE = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // index=star, value=original palace(0-based)

  // 八門 (rest宮5沒有門)
  const DOORS = ['休門','死門','傷門','杜門','','開門','驚門','生門','景門'];
  // 原始宮位: 休1, 死2, 傷3, 杜4, (5中), 開6, 驚7, 生8, 景9

  // 八神 (陽遁順序/陰遁逆序)
  const DEITIES_YANG = ['值符','螣蛇','太陰','六合','白虎','玄武','九地','九天'];
  const DEITIES_YIN = ['值符','螣蛇','太陰','六合','白虎','玄武','九天','九地'];

  // 九宮飛布順序 (排除中宮5)
  const PALACE_ORDER = [0, 1, 2, 3, 5, 6, 7, 8]; // 坎1,坤2,震3,巽4,乾6,兌7,艮8,離9 (0-indexed)
  // 九宮名稱
  const PALACE_NAMES = ['坎一宮','坤二宮','震三宮','巽四宮','中五宮','乾六宮','兌七宮','艮八宮','離九宮'];
  // 九宮方位
  const PALACE_POSITIONS = ['北','西南','東','東南','中','西北','西','東北','南'];

  // 三奇六儀 (陽遁: 戊己庚辛壬癸丁丙乙, 陰遁反)
  const QI_YI_YANG = ['戊','己','庚','辛','壬','癸','丁','丙','乙'];
  const QI_YI_YIN = ['戊','己','庚','辛','壬','癸','丁','丙','乙']; // Same symbols, different rotation

  // 九宮飛布順序 (for rotation): 1→8→3→4→9→2→7→6 (戴九履一 sequence)
  const FLY_ORDER = [0, 7, 2, 3, 8, 1, 6, 5]; // 0-indexed palace positions

  /**
   * Main calculation
   */
  function calculate(year, month, day, hour) {
    // Get 局數 info
    const juInfo = Lunar.getQiMenJu(year, month, day, hour);
    const { yangDun, juShu } = juInfo;

    // Get hour pillar to determine 時干
    const dp = Lunar.dayPillar(year, month, day);
    const hp = Lunar.hourPillar(hour, dp.ganIdx);

    // 值符值使 determination
    // 時干所在旬首 → 找出值符星和值使門
    const xunshou = getXunShou(dp.ganIdx, dp.zhiIdx, hp.ganIdx, hp.zhiIdx);

    // Place 地盤 (Earth plate): based on 局數
    const diPan = placeDiPan(juShu, yangDun);

    // 值符星 = 時干旬首所在地盤宮位的星
    const zhiFuStarIdx = getZhiFuStar(xunshou.ganIdx, diPan);

    // Place 天盤 (Heaven plate): rotate stars based on 值符 following 時干
    const tianPan = placeTianPan(zhiFuStarIdx, hp.ganIdx, diPan, yangDun);

    // Place 人盤八門 (Human plate / Eight Doors)
    const renPan = placeRenPan(zhiFuStarIdx, hp.ganIdx, diPan, yangDun);

    // Place 神盤八神 (Deity plate)
    const shenPan = placeShenPan(zhiFuStarIdx, hp.ganIdx, diPan, yangDun);

    // Combine into nine palaces
    const palaces = [];
    for (let i = 0; i < 9; i++) {
      palaces.push({
        name: PALACE_NAMES[i],
        position: PALACE_POSITIONS[i],
        diGan: diPan[i],       // 地盤天干
        tianGan: tianPan.gans[i], // 天盤天干
        star: tianPan.stars[i],  // 天盤九星
        door: renPan[i],         // 八門
        deity: shenPan[i],       // 八神
      });
    }

    // Generate interpretations
    const interpretations = palaces.map((p, i) => interpretPalace(p, i));

    return {
      yangDun,
      juShu,
      yuan: juInfo.yuan,
      termName: juInfo.termName,
      hourPillar: hp.text,
      dayPillar: dp.text,
      zhiFuStar: STARS[zhiFuStarIdx],
      palaces,
      interpretations
    };
  }

  /**
   * Get 旬首 (start of the current 10-day cycle)
   */
  function getXunShou(dayGanIdx, dayZhiIdx, hourGanIdx, hourZhiIdx) {
    // Find the 旬首 of the current hour's 干支
    // 旬首 is the 甲X of the 10-stem cycle containing the hour stem
    // Actually for QiMen, we need the day's 旬首
    // 旬首: go back from current day stem to 甲
    const stepsBack = dayGanIdx; // 甲=0, so steps back = dayGanIdx
    const xunshouZhiIdx = ((dayZhiIdx - stepsBack) % 12 + 12) % 12;
    return { ganIdx: 0, zhiIdx: xunshouZhiIdx }; // 甲X
  }

  /**
   * Place 地盤 (Earth plate)
   * 陽遁: 局數放在坎一宮, 順排
   * 陰遁: 局數放在坎一宮, 逆排
   */
  function placeDiPan(juShu, yangDun) {
    const gans = new Array(9).fill('');
    const qiyi = QI_YI_YANG; // 戊己庚辛壬癸丁丙乙

    if (yangDun) {
      // 陽遁: 從局數開始, 按照宮序順排
      // 局數對應的是 戊 所在的宮位
      // 地盤排法: 戊在局數宮, 然後按照陽遁順序(1→2→3→4→5→6→7→8→9)排列
      let palace = juShu - 1; // 0-indexed
      for (let i = 0; i < 9; i++) {
        gans[palace] = qiyi[i];
        palace = nextPalace(palace, true);
      }
    } else {
      // 陰遁: 戊在局數宮, 逆排
      let palace = juShu - 1;
      for (let i = 0; i < 9; i++) {
        gans[palace] = qiyi[i];
        palace = nextPalace(palace, false);
      }
    }
    return gans;
  }

  /**
   * Next palace in flying star order
   */
  function nextPalace(current, forward) {
    // 九宮飛布: 1→2→3→4→5→6→7→8→9→1 (for our 0-indexed: 0→1→2→3→4→5→6→7→8→0)
    // But traditional flying: 坎1→坤2→震3→巽4→中5→乾6→兌7→艮8→離9
    // Actually the standard order is: 1→8→3→4→9→2→7→6→(1) (洛書飛星順序)
    const flySeq = [0, 7, 2, 3, 8, 1, 6, 5, 4]; // Luoshu flying order (0-indexed)
    const idx = flySeq.indexOf(current);
    if (forward) {
      return flySeq[(idx + 1) % 9];
    } else {
      return flySeq[(idx + 8) % 9];
    }
  }

  /**
   * Get 值符星 index
   */
  function getZhiFuStar(xunshouGanIdx, diPan) {
    // 旬首天干 = 甲(0), but 甲 hides under 戊 in QiMen
    // The 值符 star is the star originally at the palace where 甲(戊) sits on the Earth plate
    // 旬首所在地盤宮 → that palace's original star = 值符

    // Find which palace has 戊 on the earth plate
    const wuPalace = diPan.indexOf('戊');
    // The star originally at that palace
    return wuPalace; // star index = palace index (original position)
  }

  /**
   * Place 天盤 (rotate stars)
   */
  function placeTianPan(zhiFuStarIdx, hourGanIdx, diPan, yangDun) {
    const stars = new Array(9).fill('');
    const gans = new Array(9).fill('');

    // 值符隨時干: 值符星飛到時干所在的地盤宮位
    // Find the palace where the hour stem sits on earth plate
    const hourGan = Lunar.TIAN_GAN[hourGanIdx];
    // Map hour stem to QiMen stem (三奇六儀)
    // For the time being, find which earth palace has this stem's corresponding 奇儀
    const qimenStem = ganToQiYi(hourGanIdx);
    let hourPalace = diPan.indexOf(qimenStem);
    if (hourPalace === -1) hourPalace = 4; // Default to center

    // Rotation offset: from 值符's original palace to hour stem palace
    const offset = hourPalace - zhiFuStarIdx;

    // Place all stars with offset
    for (let i = 0; i < 9; i++) {
      let newPalace;
      if (i === 4) {
        // 天禽 goes to center (or follows convention: 寄坤2/艮8)
        newPalace = 4;
        stars[4] = STARS[4];
        gans[4] = diPan[i]; // Center earth stem
        continue;
      }
      newPalace = ((i + offset) % 9 + 9) % 9;
      if (newPalace === 4) {
        // Skip center, use convention
        newPalace = yangDun ? 1 : 7; // 寄坤 or 寄艮
      }
      stars[newPalace] = STARS[i];
      // 天盤天干: the earth stem of the star's original palace flies with it
      gans[newPalace] = diPan[i];
    }

    // Fill any empty spots
    for (let i = 0; i < 9; i++) {
      if (!stars[i]) stars[i] = STARS[i];
      if (!gans[i]) gans[i] = diPan[i];
    }

    return { stars, gans };
  }

  /**
   * Map 天干 to 三奇六儀
   */
  function ganToQiYi(ganIdx) {
    // 甲→戊, 乙→乙, 丙→丙, 丁→丁
    // 甲遁入六儀: 甲子戊, 甲戌己, 甲申庚, 甲午辛, 甲辰壬, 甲寅癸
    if (ganIdx === 0) return '戊'; // 甲→戊
    return Lunar.TIAN_GAN[ganIdx];
  }

  /**
   * Place 八門 (Eight Doors on Human plate)
   */
  function placeRenPan(zhiFuStarIdx, hourGanIdx, diPan, yangDun) {
    const doors = new Array(9).fill('');

    // 值使門 = 值符星原宮位的門
    const zhiShiDoorIdx = zhiFuStarIdx;
    const qimenStem = ganToQiYi(hourGanIdx);
    let hourPalace = diPan.indexOf(qimenStem);
    if (hourPalace === -1) hourPalace = 4;

    const offset = hourPalace - zhiShiDoorIdx;

    for (let i = 0; i < 9; i++) {
      if (i === 4) { doors[4] = ''; continue; } // Center has no door
      let newPalace = ((i + offset) % 9 + 9) % 9;
      if (newPalace === 4) newPalace = yangDun ? 1 : 7;
      doors[newPalace] = DOORS[i];
    }

    // Fill empty
    for (let i = 0; i < 9; i++) {
      if (!doors[i] && i !== 4) doors[i] = DOORS[i];
    }

    return doors;
  }

  /**
   * Place 八神 (Eight Deities)
   */
  function placeShenPan(zhiFuStarIdx, hourGanIdx, diPan, yangDun) {
    const deities = new Array(9).fill('');
    const deityList = yangDun ? DEITIES_YANG : DEITIES_YIN;

    // 值符(八神之首)在值符星所到的天盤宮位
    const qimenStem = ganToQiYi(hourGanIdx);
    let startPalace = diPan.indexOf(qimenStem);
    if (startPalace === -1) startPalace = 4;

    // Place 值符 deity at startPalace, then distribute rest
    let palace = startPalace;
    let di = 0;
    for (let count = 0; count < 8; count++) {
      if (palace === 4) palace = yangDun ? nextPalaceSimple(palace, yangDun) : nextPalaceSimple(palace, yangDun);
      deities[palace] = deityList[di];
      di++;
      palace = nextPalaceSimple(palace, yangDun);
    }

    return deities;
  }

  function nextPalaceSimple(current, forward) {
    // Simple sequence around the 8 outer palaces: 0,7,2,3,8,1,6,5 (坎艮震巽離坤兌乾)
    const seq = [0, 7, 2, 3, 8, 1, 6, 5];
    const idx = seq.indexOf(current);
    if (idx === -1) return seq[0]; // If center, go to first
    if (forward) return seq[(idx + 1) % 8];
    return seq[(idx + 7) % 8];
  }

  /**
   * Interpret a palace
   */
  function interpretPalace(palace, index) {
    if (index === 4) return '中宮為天禽星所在，通常寄坤宮或艮宮分析。';

    const starMeaning = {
      '天蓬': '主智慧謀略，利於策劃',
      '天芮': '主疾病阻礙，宜謹慎',
      '天衝': '主行動果決，利於進取',
      '天輔': '主文昌學業，利於學習',
      '天禽': '主中正平和，百事可為',
      '天心': '主決策領導，利於求醫',
      '天柱': '主口舌是非，宜守不宜攻',
      '天任': '主穩重踏實，利於求財',
      '天英': '主文藝才華，利於表現',
    };

    const doorMeaning = {
      '開門': '吉門，利於開業求財',
      '休門': '吉門，利於休養求貴',
      '生門': '吉門，利於求財生產',
      '傷門': '凶門，主傷災口舌',
      '杜門': '凶門，主阻塞不通',
      '景門': '中平，利於考試文書',
      '死門': '凶門，主死亡喪事',
      '驚門': '凶門，主驚恐不安',
    };

    let text = '';
    if (palace.star && starMeaning[palace.star]) text += starMeaning[palace.star] + '。';
    if (palace.door && doorMeaning[palace.door]) text += doorMeaning[palace.door] + '。';
    if (palace.deity) text += `${palace.deity}臨此宮。`;

    return text || '此宮平平，無特殊吉凶。';
  }

  return { calculate, PALACE_NAMES, PALACE_POSITIONS, STARS, DOORS };
})();
