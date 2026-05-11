/**
 * ziwei.js - 紫微斗數排盤引擎
 * Complete Zi Wei Dou Shu calculation engine
 */

const ZiWei = (() => {
  'use strict';

  // ===== Lunar Calendar Data (1900-2100) =====
  // Each entry: hex encoding of lunar year info
  // Bits 20-23: leap month (0=no leap)
  // Bit 16: leap month length (0=29, 1=30)
  // Bits 4-15: month lengths (bit=1→30 days, month 1 at bit 4)
  // Bits 0-3: unused/reserved
  const LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
    0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252, // 2090-2099
    0x0d520 // 2100
  ];

  // Solar date of Lunar New Year for each year 1900-2100
  // Encoded as month*100+day (e.g., 131 = Jan 31)
  const LUNAR_NEW_YEAR = [
    131,219,208,129,216,204,125,213,202,121, // 1900-1909
    210,130,218,206,126,214,204,123,211,201, // 1910-1919
    220,208,128,216,205,124,213,202,123,210, // 1920-1929
    130,217,206,126,214,204,124,211,131,219, // 1930-1939
    208,127,215,205,125,213,202,122,210,129, // 1940-1949
    217,206,127,214,203,124,212,131,218,208, // 1950-1959
    128,215,205,125,213,202,121,209,130,217, // 1960-1969
    206,127,215,203,123,211,131,218,207,128, // 1970-1979
    216,205,125,213,202,220,209,129,217,206, // 1980-1989
    127,215,204,123,210,131,219,207,128,216, // 1990-1999
    205,124,212,201,122,209,129,218,207,126, // 2000-2009
    214,203,123,210,131,219,208,128,216,205, // 2010-2019
    125,212,201,122,210,129,217,206,127,214, // 2020-2029
    203,123,211,131,219,208,128,215,204,124, // 2030-2039
    212,201,122,210,130,217,206,126,214,203, // 2040-2049
    123,211,201,119,208,128,215,204,124,212, // 2050-2059
    202,121,210,130,217,206,126,213,203,123, // 2060-2069
    211,131,219,208,127,215,205,124,212,202, // 2070-2079
    122,209,129,217,206,126,214,203,124,211, // 2080-2089
    131,218,207,127,215,205,125,213,202,121, // 2090-2099
    209 // 2100
  ];

  /**
   * Get leap month for a lunar year (0 = no leap)
   */
  function leapMonth(year) {
    return LUNAR_INFO[year - 1900] & 0xf;
  }

  /**
   * Get days in a lunar month (29 or 30)
   */
  function lunarMonthDays(year, month) {
    return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29;
  }

  /**
   * Get days in the leap month (29 or 30), 0 if no leap
   */
  function leapMonthDays(year) {
    if (leapMonth(year) === 0) return 0;
    return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29;
  }

  /**
   * Total days in a lunar year
   */
  function lunarYearDays(year) {
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      total += lunarMonthDays(year, i);
    }
    total += leapMonthDays(year);
    return total;
  }

  /**
   * Convert solar date to lunar date
   * Returns { year, month, day, isLeap, yearGanIdx, yearZhiIdx }
   */
  function solarToLunar(sy, sm, sd) {
    // Calculate days from 1900-01-31 (Lunar 1900-01-01)
    const baseDate = new Date(1900, 0, 31); // Jan 31, 1900
    const targetDate = new Date(sy, sm - 1, sd);
    let offset = Math.floor((targetDate - baseDate) / 86400000);

    // Find lunar year
    let lunarY = 1900;
    let daysInYear;
    while (lunarY < 2101 && offset > 0) {
      daysInYear = lunarYearDays(lunarY);
      if (offset < daysInYear) break;
      offset -= daysInYear;
      lunarY++;
    }

    // Find lunar month
    let lunarM = 1;
    let isLeap = false;
    const leap = leapMonth(lunarY);
    let daysInMonth;

    for (let i = 1; i <= 12; i++) {
      // Regular month
      daysInMonth = lunarMonthDays(lunarY, i);
      if (offset < daysInMonth) {
        lunarM = i;
        break;
      }
      offset -= daysInMonth;

      // Check leap month after this month
      if (i === leap) {
        daysInMonth = leapMonthDays(lunarY);
        if (offset < daysInMonth) {
          lunarM = i;
          isLeap = true;
          break;
        }
        offset -= daysInMonth;
      }

      if (i === 12) lunarM = 12;
    }

    const lunarD = offset + 1;

    // Year GanZhi (using lunar year, traditional method: based on year itself, not lichun)
    const yearGZIdx = ((lunarY - 4) % 60 + 60) % 60;

    return {
      year: lunarY,
      month: lunarM,
      day: lunarD,
      isLeap,
      yearGanIdx: yearGZIdx % 10,
      yearZhiIdx: yearGZIdx % 12
    };
  }

  // ===== Constants =====
  const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const SHENG_XIAO = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'];

  const PALACE_NAMES = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','交友','官祿','田宅','福德','父母'];

  const SHI_CHEN_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const SHI_CHEN_LABELS = [
    '子時(23-01)','丑時(01-03)','寅時(03-05)','卯時(05-07)',
    '辰時(07-09)','巳時(09-11)','午時(11-13)','未時(13-15)',
    '申時(15-17)','酉時(17-19)','戌時(19-21)','亥時(21-23)'
  ];

  // 五行局 names
  const JU_NAMES = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  const JU_WUXING = { 2: '大海水', 3: '大林木', 4: '砂石金', 5: '城頭土', 6: '天河火' };

  // 十四主星
  const MAIN_STARS_ZI = ['紫微','天機','太陽','武曲','天同','廉貞'];
  const MAIN_STARS_FU = ['天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍'];

  // 紫微系 offsets from 紫微 (counterclockwise = decreasing)
  const ZI_OFFSETS = [0, -1, -3, -4, -5, -7];
  // 天府系 offsets from 天府 (clockwise = increasing)
  const FU_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 10];

  // ===== 納音五行 for 五行局 =====
  const NA_YIN_WX = [
    '金','金','火','火','木','木','土','土','金','金',
    '火','火','水','水','土','土','金','金','木','木',
    '水','水','土','土','火','火','木','木','水','水',
    '金','金','火','火','木','木','土','土','金','金',
    '火','火','水','水','土','土','金','金','木','木',
    '水','水','土','土','火','火','木','木','水','水'
  ];

  const WX_TO_JU = { '水': 2, '木': 3, '金': 4, '土': 5, '火': 6 };

  // ===== 命主 table (by 命宮地支) =====
  const MING_ZHU = ['貪狼','巨門','祿存','文曲','廉貞','武曲','破軍','武曲','廉貞','文曲','祿存','巨門'];
  // 子丑寅卯辰巳午未申酉戌亥

  // ===== 身主 table (by 生年地支) =====
  const SHEN_ZHU = ['火星','天相','天梁','天同','文昌','天機','火星','天相','天梁','天同','文昌','天機'];
  // 子丑寅卯辰巳午未申酉戌亥

  // ===== 四化表 (by year stem) =====
  // 化祿, 化權, 化科, 化忌
  const SI_HUA = {
    0: ['廉貞','破軍','武曲','太陽'],  // 甲
    1: ['天機','天梁','紫微','太陰'],  // 乙
    2: ['天同','天機','文昌','廉貞'],  // 丙
    3: ['太陰','天同','天機','巨門'],  // 丁
    4: ['貪狼','太陰','右弼','天機'],  // 戊
    5: ['武曲','貪狼','天梁','文曲'],  // 己
    6: ['太陽','武曲','太陰','天同'],  // 庚
    7: ['巨門','太陽','文曲','文昌'],  // 辛
    8: ['天梁','紫微','左輔','武曲'],  // 壬
    9: ['破軍','巨門','太陰','貪狼'],  // 癸
  };
  const HUA_NAMES = ['化祿','化權','化科','化忌'];

  // ===== 文昌文曲 (by birth hour index 0-11) =====
  // 文昌: 戌酉申未午巳辰卯寅丑子亥 (from 子時 to 亥時)
  const WEN_CHANG = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 11];
  // 文曲: 辰巳午未申酉戌亥子丑寅卯
  const WEN_QU = [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3];

  // ===== 左輔右弼 (by birth month) =====
  // 左輔: month 1→辰, 2→巳, 3→午, ... (month+3 from 子)
  function zuoFuPos(month) { return (month + 3) % 12; }
  // 右弼: month 1→戌, 2→酉, 3→申, ... (11-month from 子, or 10-month+1)
  function youBiPos(month) { return ((10 - month + 1) % 12 + 12) % 12; }

  // ===== 天魁天鉞 (by year stem) =====
  // 天魁(貴人): 甲→丑, 乙→子, 丙→亥, 丁→酉, 戊→丑, 己→子, 庚→丑, 辛→午, 壬→卯, 癸→卯
  const TIAN_KUI = [1, 0, 11, 9, 1, 0, 1, 6, 3, 3];
  // 天鉞(貴人): 甲→未, 乙→申, 丙→酉, 丁→亥, 戊→未, 己→申, 庚→未, 辛→寅, 壬→巳, 癸→巳
  const TIAN_YUE = [7, 8, 9, 11, 7, 8, 7, 2, 5, 5];

  // ===== 祿存擎羊陀羅 (by year stem) =====
  // 祿存: 甲→寅, 乙→卯, 丙→巳, 丁→午, 戊→巳, 己→午, 庚→申, 辛→酉, 壬→亥, 癸→子
  const LU_CUN = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  // 擎羊 = 祿存+1, 陀羅 = 祿存-1
  function qingYangPos(yearGan) { return (LU_CUN[yearGan] + 1) % 12; }
  function tuoLuoPos(yearGan) { return (LU_CUN[yearGan] - 1 + 12) % 12; }

  // ===== 火星鈴星 (by year branch + hour) =====
  // 火星 starting position by year branch group:
  // 寅午戌年→丑起, 申子辰年→寅起, 巳酉丑年→卯起, 亥卯未年→酉起
  function huoXingPos(yearZhi, hourIdx) {
    let start;
    if ([2, 6, 10].includes(yearZhi)) start = 1;      // 寅午戌→丑
    else if ([8, 0, 4].includes(yearZhi)) start = 2;   // 申子辰→寅
    else if ([5, 9, 1].includes(yearZhi)) start = 3;   // 巳酉丑→卯
    else start = 9;                                      // 亥卯未→酉
    return (start + hourIdx) % 12;
  }

  // 鈴星 starting position by year branch group:
  // 寅午戌年→卯起, 申子辰年→戌起, 巳酉丑年→戌起, 亥卯未年→戌起
  function lingXingPos(yearZhi, hourIdx) {
    let start;
    if ([2, 6, 10].includes(yearZhi)) start = 3;      // 寅午戌→卯
    else start = 10;                                    // 其他→戌
    return (start + hourIdx) % 12;
  }

  // ===== 地空地劫 (by birth hour) =====
  // 地空: 子時→亥, 順行 (亥+hourIdx)
  function diKongPos(hourIdx) { return (11 - hourIdx + 12) % 12; }
  // 地劫: 子時→亥, 逆行 (亥-hourIdx)  Actually:
  // 地劫: hourIdx from 子=亥 counting forward
  function diJiePos(hourIdx) { return (hourIdx + 11) % 12; }

  // ===== Star Brightness Tables =====
  // Format: star name → array of 12 values (子 through 亥)
  // 廟=5, 旺=4, 得地=3, 利=2(平和), 不得地=1(平), 落陷=0
  const BRIGHTNESS = {
    '紫微': [3,5,1,2,5,3,5,3,1,2,5,3],
    '天機': [3,1,5,4,2,0,3,1,5,4,2,0],
    '太陽': [0,1,3,5,5,4,5,3,2,1,0,0],
    '武曲': [5,3,2,1,5,2,5,3,2,1,5,2],
    '天同': [5,1,0,3,2,1,5,1,0,3,2,4],
    '廉貞': [2,1,5,0,2,3,2,1,5,0,2,3],
    '天府': [5,4,5,3,2,5,3,4,5,3,2,5],
    '太陰': [5,5,4,3,2,1,0,0,1,2,3,4],
    '貪狼': [4,3,5,2,0,5,4,3,5,2,0,5],
    '巨門': [4,5,3,2,1,5,4,5,3,2,1,5],
    '天相': [5,3,2,0,5,4,5,3,2,0,5,4],
    '天梁': [5,4,0,2,3,5,5,4,0,2,3,5],
    '七殺': [5,3,4,2,1,5,5,3,4,2,1,5],
    '破軍': [4,0,5,2,1,3,4,0,5,2,1,3],
  };
  const BRIGHTNESS_NAMES = ['落陷','不得地','平和','得地','旺','廟'];

  // ===== Core Calculation =====

  /**
   * Get 紫微星 position (地支 index 0-11)
   */
  function getZiweiPos(ju, day) {
    const q = Math.ceil(day / ju);
    const v = q * ju - day; // virtual excess
    let pos;
    if (v % 2 === 0) {
      pos = 2 + q - 1 - v / 2;
    } else {
      pos = 2 + q - 1 + (v + 1) / 2;
    }
    return ((pos % 12) + 12) % 12;
  }

  /**
   * Get 天府星 position from 紫微 position
   */
  function getTianfuPos(ziweiPos) {
    return ((4 - ziweiPos) % 12 + 12) % 12;
  }

  /**
   * Calculate 命宮 地支 index
   * Formula: start from 寅(2) for month 1, add (month-1), subtract hourIdx
   */
  function getMingGongZhi(lunarMonth, hourIdx) {
    return ((2 + (lunarMonth - 1) - hourIdx) % 12 + 12) % 12;
  }

  /**
   * Calculate 身宮 地支 index
   */
  function getShenGongZhi(lunarMonth, hourIdx) {
    return ((2 + (lunarMonth - 1) + hourIdx) % 12 + 12) % 12;
  }

  /**
   * Get 天干 for each palace position (地支 0-11)
   * Based on year stem using 五虎遁
   */
  function getPalaceGan(yearGanIdx) {
    const ganStart = [2, 4, 6, 8, 0][yearGanIdx % 5]; // 寅宮 starting 天干
    const result = new Array(12);
    for (let zhi = 0; zhi < 12; zhi++) {
      // 寅=2 gets ganStart, 卯=3 gets ganStart+1, etc.
      result[zhi] = (ganStart + ((zhi - 2 + 12) % 12)) % 10;
    }
    return result;
  }

  /**
   * Get 五行局 from 命宮 天干+地支
   */
  function getJu(mingGan, mingZhi) {
    // Find 60 甲子 index
    for (let i = 0; i < 60; i++) {
      if (i % 10 === mingGan && i % 12 === mingZhi) {
        return WX_TO_JU[NA_YIN_WX[i]];
      }
    }
    return 2; // fallback
  }

  /**
   * Get 納音 name
   */
  function getNaYin(ganIdx, zhiIdx) {
    return Lunar.naYin(ganIdx, zhiIdx);
  }

  /**
   * Main calculation function
   */
  function calculate(solarYear, solarMonth, solarDay, hourIdx, gender) {
    // Step 1: Solar to Lunar
    const lunar = solarToLunar(solarYear, solarMonth, solarDay);

    // Step 2: 命宮 and 身宮
    const mingZhi = getMingGongZhi(lunar.month, hourIdx);
    const shenZhi = getShenGongZhi(lunar.month, hourIdx);

    // Step 3: Palace 天干
    const palaceGans = getPalaceGan(lunar.yearGanIdx);
    const mingGan = palaceGans[mingZhi];

    // Step 4: 五行局
    const ju = getJu(mingGan, mingZhi);

    // Step 5: Place 12 Palaces
    const palaces = new Array(12); // index by 地支 position (0=子, 1=丑, ...)
    for (let i = 0; i < 12; i++) {
      palaces[i] = {
        zhi: i,
        zhiName: DI_ZHI[i],
        gan: palaceGans[i],
        ganName: TIAN_GAN[palaceGans[i]],
        ganZhi: TIAN_GAN[palaceGans[i]] + DI_ZHI[i],
        palaceName: '',
        palaceIdx: -1,
        stars: [],
        isMing: i === mingZhi,
        isShen: i === shenZhi,
        daXianStart: 0,
        daXianEnd: 0,
      };
    }

    // Assign palace names (counter-clockwise from 命宮)
    for (let i = 0; i < 12; i++) {
      const zhi = ((mingZhi - i) % 12 + 12) % 12;
      palaces[zhi].palaceName = PALACE_NAMES[i];
      palaces[zhi].palaceIdx = i;
    }

    // Step 6: Place 紫微 and main stars
    const ziweiPos = getZiweiPos(ju, lunar.day);
    const tianfuPos = getTianfuPos(ziweiPos);

    // 紫微系
    for (let i = 0; i < MAIN_STARS_ZI.length; i++) {
      const pos = ((ziweiPos + ZI_OFFSETS[i]) % 12 + 12) % 12;
      const starName = MAIN_STARS_ZI[i];
      const bright = BRIGHTNESS[starName] ? BRIGHTNESS[starName][pos] : 3;
      palaces[pos].stars.push({
        name: starName,
        type: 'main',
        brightness: BRIGHTNESS_NAMES[bright],
        brightIdx: bright,
        hua: [],
      });
    }

    // 天府系
    for (let i = 0; i < MAIN_STARS_FU.length; i++) {
      const pos = ((tianfuPos + FU_OFFSETS[i]) % 12 + 12) % 12;
      const starName = MAIN_STARS_FU[i];
      const bright = BRIGHTNESS[starName] ? BRIGHTNESS[starName][pos] : 3;
      palaces[pos].stars.push({
        name: starName,
        type: 'main',
        brightness: BRIGHTNESS_NAMES[bright],
        brightIdx: bright,
        hua: [],
      });
    }

    // Step 7: Place auxiliary stars
    // 文昌
    addStar(palaces, WEN_CHANG[hourIdx], '文昌', 'aux');
    // 文曲
    addStar(palaces, WEN_QU[hourIdx], '文曲', 'aux');
    // 左輔
    addStar(palaces, zuoFuPos(lunar.month), '左輔', 'aux');
    // 右弼
    addStar(palaces, youBiPos(lunar.month), '右弼', 'aux');
    // 天魁
    addStar(palaces, TIAN_KUI[lunar.yearGanIdx], '天魁', 'aux');
    // 天鉞
    addStar(palaces, TIAN_YUE[lunar.yearGanIdx], '天鉞', 'aux');

    // Step 8: Place 煞星
    // 祿存
    addStar(palaces, LU_CUN[lunar.yearGanIdx], '祿存', 'lu');
    // 擎羊
    addStar(palaces, qingYangPos(lunar.yearGanIdx), '擎羊', 'sha');
    // 陀羅
    addStar(palaces, tuoLuoPos(lunar.yearGanIdx), '陀羅', 'sha');
    // 火星
    addStar(palaces, huoXingPos(lunar.yearZhiIdx, hourIdx), '火星', 'sha');
    // 鈴星
    addStar(palaces, lingXingPos(lunar.yearZhiIdx, hourIdx), '鈴星', 'sha');
    // 地空
    addStar(palaces, diKongPos(hourIdx), '地空', 'sha');
    // 地劫
    addStar(palaces, diJiePos(hourIdx), '地劫', 'sha');

    // Step 9: Apply 四化
    const siHua = SI_HUA[lunar.yearGanIdx];
    for (let h = 0; h < 4; h++) {
      const starName = siHua[h];
      const huaName = HUA_NAMES[h];
      // Find this star in all palaces and mark it
      for (let p = 0; p < 12; p++) {
        for (let s = 0; s < palaces[p].stars.length; s++) {
          if (palaces[p].stars[s].name === starName) {
            palaces[p].stars[s].hua.push(huaName);
          }
        }
      }
    }

    // Step 10: 大限 calculation
    // Direction: 陽男陰女 clockwise (increasing), 陰男陽女 counterclockwise
    const yearYinYang = lunar.yearGanIdx % 2; // 0=陽, 1=陰
    const isMale = gender === '男';
    const forward = (yearYinYang === 0 && isMale) || (yearYinYang === 1 && !isMale);

    for (let i = 0; i < 12; i++) {
      const zhi = forward
        ? ((mingZhi + i) % 12 + 12) % 12
        : ((mingZhi - i) % 12 + 12) % 12;
      palaces[zhi].daXianStart = ju + i * 10;
      palaces[zhi].daXianEnd = ju + i * 10 + 9;
    }

    // Step 11: 命主 & 身主
    const mingZhu = MING_ZHU[mingZhi];
    const shenZhu = SHEN_ZHU[lunar.yearZhiIdx];

    // Build result
    const yearGZ = TIAN_GAN[lunar.yearGanIdx] + DI_ZHI[lunar.yearZhiIdx];
    const yearNaYin = getNaYin(lunar.yearGanIdx, lunar.yearZhiIdx);

    // 四柱 (using Lunar.js)
    const yp = Lunar.yearPillar(solarYear, solarMonth, solarDay, hourIdx * 2);
    const mp = Lunar.monthPillar(solarYear, solarMonth, solarDay, hourIdx * 2, yp.ganIdx);
    const dp = Lunar.dayPillar(solarYear, solarMonth, solarDay);
    const hp = Lunar.hourPillar(hourIdx * 2 + (hourIdx === 0 ? 23 : hourIdx * 2 - 1), dp.ganIdx);

    return {
      // Basic info
      solarDate: `${solarYear}年${solarMonth}月${solarDay}日`,
      lunarDate: `農曆${lunar.year}年${lunar.isLeap ? '閏' : ''}${lunar.month}月${lunar.day}日`,
      lunarDateCN: `農曆${chineseMonth(lunar.month)}月${chineseDay(lunar.day)}`,
      hourName: SHI_CHEN_LABELS[hourIdx],
      gender,

      // Year info
      yearGanZhi: yearGZ,
      yearNaYin,
      zodiac: SHENG_XIAO[lunar.yearZhiIdx],

      // Core parameters
      mingGongZhi: mingZhi,
      mingGongName: DI_ZHI[mingZhi],
      shenGongZhi: shenZhi,
      shenGongName: DI_ZHI[shenZhi],
      ju,
      juName: JU_NAMES[ju],
      mingZhu,
      shenZhu,

      // Palaces
      palaces,

      // 四化 info
      siHua: SI_HUA[lunar.yearGanIdx].map((star, i) => ({ star, hua: HUA_NAMES[i] })),

      // Lunar info
      lunar,

      // 四柱
      fourPillars: { year: yp, month: mp, day: dp, hour: hp },

      // 大限 direction
      daXianForward: forward,

      // 紫微 position
      ziweiPos,
      tianfuPos,
    };
  }

  function addStar(palaces, pos, name, type) {
    palaces[pos].stars.push({
      name,
      type,
      brightness: '',
      brightIdx: -1,
      hua: [],
    });
  }

  function chineseMonth(m) {
    const names = ['','正','二','三','四','五','六','七','八','九','十','十一','十二'];
    return names[m] || m;
  }

  function chineseDay(d) {
    const tens = ['初','初','初','初','初','初','初','初','初','初','十','十','十','十','十','十','十','十','十','十','廿','廿','廿','廿','廿','廿','廿','廿','廿','廿','三十'];
    const ones = ['','一','二','三','四','五','六','七','八','九','十','一','二','三','四','五','六','七','八','九','','一','二','三','四','五','六','七','八','九',''];
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    return (tens[d-1] || '') + (ones[d] || '');
  }

  // ===== Interpretation Engine =====
  function getInterpretation(result) {
    const mingPalace = result.palaces[result.mingGongZhi];
    const mainStars = mingPalace.stars.filter(s => s.type === 'main');

    let interp = {
      mingStars: '',
      pattern: '',
      daXian: '',
      overall: '',
    };

    // 命宮主星解讀
    if (mainStars.length === 0) {
      interp.mingStars = '命宮無主星（借對宮星曜），命運起伏較大，一生變化多端，需靠後天努力開創。個性較為飄忽不定，但也因此具備極強的適應力和靈活性。';
    } else {
      const starDescs = {
        '紫微': '紫微坐命，帝王之星。天生具有領導氣質，格局大器，心懷壯志。做事有魄力，有王者風範，但有時過於自負。適合管理、創業等需要統御能力的工作。',
        '天機': '天機坐命，智慧之星。聰明機敏，善於謀略和分析。腦筋靈活，學習能力極強。適合從事需要動腦筋的工作，如策劃、分析、科技等領域。',
        '太陽': '太陽坐命，光明之星。性格熱情開朗，樂於助人，具有強烈的責任感和正義感。男命陽剛大氣，女命獨立自主。適合服務社會、公職或教育事業。',
        '武曲': '武曲坐命，財星。性格剛毅果斷，重視實際，有很強的執行力和賺錢能力。適合金融、會計、投資或需要魄力的行業。',
        '天同': '天同坐命，福星。性格溫和、樂觀知足，人緣極佳。喜歡享受生活，追求平穩安逸。有藝術天分，適合從事文化、藝術、服務類工作。',
        '廉貞': '廉貞坐命，次桃花星。性格倔強有主見，感情豐富但外表冷酷。有很強的審美能力和藝術天分，也善於交際。在政治或商業領域都能有所成就。',
        '天府': '天府坐命，財庫之星。穩重大方，品味不凡，天生有管理和理財能力。為人寬厚，做事有條理，適合守成和理財。一生物質條件較好。',
        '太陰': '太陰坐命，富貴之星。性格細膩溫柔，善解人意，有很強的直覺力。男命風流倜儻，女命端莊典雅。適合不動產、藝術、夜間相關行業。',
        '貪狼': '貪狼坐命，桃花之星。多才多藝，興趣廣泛，善於社交和表演。人生經歷豐富多彩，具有很強的適應力和生命力。適合演藝、公關、宗教等領域。',
        '巨門': '巨門坐命，口才之星。善於表達和辯論，思維敏銳，有很強的分析力。但也容易言語是非。適合律師、教師、評論家、銷售等需要口才的工作。',
        '天相': '天相坐命，印星。為人正直，有責任感和使命感。善於協調和服務他人，是很好的幕僚人才。做事講求原則和規矩，適合公職或秘書類工作。',
        '天梁': '天梁坐命，蔭星。性格清高正直，有長輩緣。喜歡照顧他人，具有化解困難的能力。適合醫療、社工、教育、公職等服務性工作。',
        '七殺': '七殺坐命，將星。性格剛強好勝，勇於開創和冒險。做事果斷有魄力，適合軍警、創業或需要膽識的行業。一生波折較多但成就也大。',
        '破軍': '破軍坐命，耗星。性格剛烈，喜歡變化和革新。不甘平凡，一生多變動。善於破舊立新，適合革新型的工作或創業。',
      };

      const descriptions = mainStars.map(s => starDescs[s.name] || `${s.name}坐命。`);
      interp.mingStars = descriptions.join('\n\n');
    }

    // 格局分析
    const allStarNames = mingPalace.stars.map(s => s.name);
    let patterns = [];

    if (allStarNames.includes('紫微') && allStarNames.includes('天府'))
      patterns.push('紫府同宮格：帝王與相星同坐，大富大貴之格，一生財祿豐厚，地位崇高。');
    if (allStarNames.includes('紫微') && allStarNames.includes('貪狼'))
      patterns.push('紫貪同宮格：在某些宮位形成「桃花犯主」格局，但也主才華橫溢，中年後大發。');
    if (allStarNames.includes('七殺') || allStarNames.includes('破軍') || allStarNames.includes('貪狼'))
      patterns.push('殺破狼格局：人生變化大，具有開創精神。早年辛苦，中年後有大成就。適合創業和冒險型事業。');
    if (allStarNames.includes('機') && allStarNames.includes('月'))
      patterns.push('機月同梁格：適合政府機關或大型企業任職，穩定薪資。');

    // Check for 化祿 in 命宮
    const luStars = mingPalace.stars.filter(s => s.hua.includes('化祿'));
    if (luStars.length > 0)
      patterns.push(`命宮有${luStars.map(s=>s.name).join('、')}化祿，財運亨通，事業順利。`);

    const jiStars = mingPalace.stars.filter(s => s.hua.includes('化忌'));
    if (jiStars.length > 0)
      patterns.push(`命宮有${jiStars.map(s=>s.name).join('、')}化忌，需注意相關方面的困擾和阻礙。`);

    if (patterns.length === 0) {
      patterns.push('命盤格局屬於一般配置，重點在於各宮位星曜組合的互動關係。');
    }
    interp.pattern = patterns.join('\n\n');

    // 大限概述
    const now = new Date();
    const age = now.getFullYear() - parseInt(result.solarDate);
    let currentDaXian = null;
    for (let i = 0; i < 12; i++) {
      if (result.palaces[i].daXianStart <= age && age <= result.palaces[i].daXianEnd) {
        currentDaXian = result.palaces[i];
        break;
      }
    }

    if (currentDaXian) {
      const dxStars = currentDaXian.stars.filter(s => s.type === 'main').map(s => s.name);
      interp.daXian = `目前正行${currentDaXian.palaceName}（${currentDaXian.ganZhi}）大限（${currentDaXian.daXianStart}-${currentDaXian.daXianEnd}歲）。` +
        (dxStars.length > 0 ? `此限有${dxStars.join('、')}主事。` : '此限無主星，借對宮力量。');
    } else {
      interp.daXian = '大限資訊計算中...';
    }

    // Overall
    interp.overall = `此命盤${result.juName}（${JU_WUXING[result.ju] || ''}），命主${result.mingZhu}，身主${result.shenZhu}。` +
      `命宮在${result.mingGongName}，身宮在${result.shenGongName}。`;

    return interp;
  }

  return {
    calculate,
    getInterpretation,
    solarToLunar,
    PALACE_NAMES,
    DI_ZHI,
    TIAN_GAN,
    SHI_CHEN_LABELS,
  };
})();
