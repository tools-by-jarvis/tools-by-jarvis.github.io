/**
 * name.js - 姓名學 (Chinese Name Numerology)
 * 使用康熙字典筆畫數
 */

const NameAnalysis = (() => {
  // Common character stroke counts (康熙字典筆畫)
  // This is a subset; for production, use a complete database
  const STROKE_DB = {
    '一':1,'丁':2,'七':7,'三':3,'上':3,'下':3,'不':4,'世':5,'丙':5,'中':4,'丹':4,
    '之':4,'乃':2,'久':3,'也':3,'乙':1,'九':9,'事':8,'二':2,'五':5,'亞':8,'亭':9,
    '人':2,'仁':4,'今':4,'仙':5,'令':5,'以':5,'任':6,'伊':6,'伍':6,'伯':7,'佑':7,
    '何':7,'佳':8,'依':8,'俊':9,'信':9,'修':10,'倫':10,'偉':11,'傑':12,'儀':15,
    '元':4,'先':6,'光':6,'克':7,'全':6,'八':2,'公':4,'六':6,'兵':7,'其':8,'典':8,
    '冠':9,'凱':12,'力':2,'功':5,'加':5,'勇':9,'勝':12,'化':4,'北':5,'千':3,
    '升':4,'午':4,'半':5,'南':9,'博':12,'卓':8,'卿':10,'又':2,'友':4,'叔':8,
    '可':5,'台':5,'史':5,'右':5,'司':5,'吉':6,'同':6,'名':6,'向':6,'君':7,
    '吟':7,'含':7,'吳':7,'呈':7,'和':8,'品':9,'哲':10,'唐':10,'善':12,'喜':12,
    '嘉':14,'四':4,'國':11,'圓':13,'土':3,'在':6,'坤':8,'城':10,'堅':11,'堯':12,
    '塵':14,'士':3,'壬':4,'夏':10,'大':3,'天':4,'太':4,'夫':4,'央':5,'奇':8,
    '奕':9,'女':3,'好':6,'如':6,'妙':7,'姿':9,'威':9,'娟':10,'婉':11,'婷':12,
    '媛':12,'嫻':15,'子':3,'孝':7,'孟':8,'季':8,'學':16,'宇':6,'安':6,'宏':7,
    '宗':8,'官':8,'宜':8,'客':9,'宣':9,'家':10,'容':10,'富':12,'寒':12,'實':14,
    '寧':14,'寶':20,'小':3,'少':4,'尚':8,'山':3,'岳':8,'峰':10,'崇':11,'嵐':12,
    '川':3,'巧':5,'己':3,'已':3,'巳':3,'帆':6,'希':7,'平':5,'年':6,'幸':8,
    '庭':10,'康':11,'廷':7,'建':9,'弘':5,'強':11,'彥':9,'彩':11,'彬':11,'影':15,
    '德':15,'心':4,'志':7,'忠':8,'思':9,'怡':9,'恆':10,'恩':10,'悅':11,'情':12,
    '惠':12,'意':13,'愛':13,'慈':14,'慧':15,'慶':15,'憲':16,'成':7,'我':7,'戰':16,
    '才':4,'承':8,'振':11,'揚':13,'政':9,'敏':11,'文':4,'斌':11,'新':13,'方':4,
    '旭':6,'昌':8,'明':8,'昕':8,'星':9,'春':9,'昭':9,'晉':10,'晨':11,'智':12,
    '暉':13,'曉':16,'書':10,'月':4,'朗':11,'朝':12,'木':4,'本':5,'李':7,'杰':8,
    '東':8,'松':8,'林':8,'柏':9,'柔':9,'柳':9,'桂':10,'梁':11,'梅':11,'森':12,
    '楊':13,'榮':14,'樂':15,'正':5,'武':8,'毅':15,'民':5,'水':4,'永':5,'江':7,
    '池':7,'沛':8,'河':9,'治':9,'泉':9,'法':9,'波':9,'泰':10,'洋':10,'洪':10,
    '浩':11,'海':11,'涵':12,'淑':12,'清':12,'淳':12,'湘':13,'源':14,'溪':14,
    '漢':15,'潔':16,'澤':17,'火':4,'炎':8,'為':12,'煒':13,'熙':13,'燕':16,
    '玉':5,'王':4,'珊':10,'珍':10,'珠':11,'琪':13,'琳':13,'琴':13,'瑋':14,
    '瑞':14,'瑜':14,'瑤':15,'璇':16,'瓊':20,'生':5,'田':5,'甲':5,'申':5,
    '男':7,'祥':11,'福':14,'秀':7,'秋':9,'穎':16,'立':5,'竹':6,'筠':13,
    '紅':9,'純':10,'紫':12,'維':14,'緯':15,'美':9,'義':13,'翔':12,'翰':16,
    '耀':20,'聖':13,'聰':17,'育':10,'能':10,'自':6,'至':6,'興':16,'芬':10,
    '芳':10,'花':10,'英':11,'茂':11,'茹':12,'莉':13,'莊':13,'華':14,'萍':14,
    '萬':15,'蓉':16,'蓮':17,'藝':21,'蘭':23,'行':6,'衛':16,'裕':13,'西':6,
    '詠':12,'詩':13,'誠':14,'謙':17,'豐':18,'賢':15,'超':12,'軍':9,'輝':15,
    '辰':7,'達':16,'邦':7,'郁':13,'鈺':13,'銘':14,'鑫':24,'長':8,'雅':12,
    '雄':12,'雪':11,'雲':12,'霖':16,'霞':17,'青':8,'靖':13,'靜':16,'韋':9,
    '韻':19,'順':12,'風':9,'飛':9,'馨':20,'駿':17,'鳳':14,'鴻':17,'麗':19,
    '龍':16,'玲':10,'俐':9,'宸':10,'彤':7,'妍':7,'涵':12,'萱':15,'瑩':15,
    '晴':12,'婕':11,'琦':13,'祺':13,'諾':16,'瀚':20,'睿':14,'熠':15,
    '陳':16,'炯':9,'翰':16,
    '張':11,'劉':15,'黃':12,'趙':14,'周':8,'吳':7,'鄭':15,'孫':10,'朱':6,
    '馬':10,'胡':11,'郭':15,'楊':13,'蔡':17,'蕭':18,'許':11,'葉':15,'蘇':22,
    '沈':8,'曾':12,'呂':7,'施':9,'盧':16,'魏':18,'鄧':19,'譚':19,'高':10,
    '宋':7,'唐':10,'程':12,'潘':16,'丘':5,'邱':12,'彭':12,'石':5,'馮':12,
    '姜':9,'崔':11,'董':15,'梁':11,'杜':7,'蔣':17,'范':15,'傅':12,'鍾':17,
    '錢':16,'姚':9,'廖':14,'汪':8,'尹':4,'袁':10,'戴':18,'田':5,'余':7,'薛':19,
    '邵':12,'章':11,'賴':16,'閻':16,'譚':19,'韓':17,'龔':22,'甘':5,'蕭':18,
  };

  // 五格吉凶表 (1-81)
  const FORTUNE_TABLE = [
    '', // 0 placeholder
    '吉','凶','吉','凶','吉','吉','吉','吉','凶','凶', // 1-10
    '吉','凶','吉','凶','吉','吉','半吉','半吉','凶','凶', // 11-20
    '吉','凶','吉','吉','吉','凶','凶','凶','吉','凶', // 21-30
    '吉','吉','吉','凶','吉','凶','吉','半吉','凶','凶', // 31-40
    '吉','凶','凶','凶','吉','凶','吉','吉','凶','凶', // 41-50
    '半吉','吉','凶','凶','凶','凶','吉','半吉','凶','凶', // 51-60
    '凶','凶','吉','凶','吉','凶','吉','吉','凶','凶', // 61-70
    '半吉','凶','吉','凶','凶','凶','半吉','半吉','凶','凶', // 71-80
    '吉' // 81
  ];

  // 五格五行 (尾數: 1,2=木, 3,4=火, 5,6=土, 7,8=金, 9,0=水)
  function geWuXing(num) {
    const n = num % 10;
    if (n === 1 || n === 2) return '木';
    if (n === 3 || n === 4) return '火';
    if (n === 5 || n === 6) return '土';
    if (n === 7 || n === 8) return '金';
    return '水'; // 9, 0
  }

  // 五格描述
  const GE_DESCRIPTIONS = {
    '天格': '代表先天運勢，由姓氏決定，對人生影響較小。',
    '人格': '代表主運，影響一生的運勢和性格，最為重要。',
    '地格': '代表前運（36歲前），影響青年時期的運勢。',
    '外格': '代表副運，影響人際關係和社會環境。',
    '總格': '代表後運（36歲後），影響中晚年運勢。',
  };

  /**
   * Get stroke count for a character
   * Falls back to Unicode-based estimation
   */
  function getStrokes(char) {
    if (STROKE_DB[char] !== undefined) return STROKE_DB[char];
    // Fallback: rough estimation based on Unicode radical data
    // This is not accurate; for production use a complete database
    const code = char.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) {
      // Very rough estimate: hash to 5-25 range
      return ((code - 0x4e00) % 21) + 5;
    }
    return 10; // default
  }

  /**
   * Calculate 五格 (Five Grids)
   * @param {string} surname - 姓 (1-2 chars)
   * @param {string} givenName - 名 (1-2 chars)
   */
  function calculate(fullName) {
    const chars = fullName.split('');
    if (chars.length < 2 || chars.length > 4) {
      return { error: '請輸入2-4個字的姓名' };
    }

    const strokes = chars.map(c => getStrokes(c));

    let tianGe, renGe, diGe, waiGe, zongGe;

    if (chars.length === 2) {
      // 單姓單名: 姓(a) 名(b)
      const a = strokes[0], b = strokes[1];
      tianGe = a + 1;
      renGe = a + b;
      diGe = b + 1;
      waiGe = 2;
      zongGe = a + b;
    } else if (chars.length === 3) {
      // 單姓雙名: 姓(a) 名(b)(c) OR 複姓單名: 姓(a)(b) 名(c)
      // Default: treat as 單姓雙名 (most common)
      const a = strokes[0], b = strokes[1], c = strokes[2];
      tianGe = a + 1;
      renGe = a + b;
      diGe = b + c;
      waiGe = a + c; // Corrected: 外格 = 總格 - 人格 + 1, simplified
      zongGe = a + b + c;
      waiGe = zongGe - renGe + 1;
    } else if (chars.length === 4) {
      // 複姓雙名
      const a = strokes[0], b = strokes[1], c = strokes[2], d = strokes[3];
      tianGe = a + b;
      renGe = b + c;
      diGe = c + d;
      zongGe = a + b + c + d;
      waiGe = zongGe - renGe + 1;
    }

    // Ensure in range
    const normalize = n => n > 81 ? n % 80 : (n < 1 ? 1 : n);
    tianGe = normalize(tianGe);
    renGe = normalize(renGe);
    diGe = normalize(diGe);
    waiGe = normalize(waiGe);
    zongGe = normalize(zongGe);

    const result = {
      name: fullName,
      chars: chars.map((c, i) => ({ char: c, strokes: strokes[i] })),
      grids: [
        { name: '天格', value: tianGe, fortune: getFortune(tianGe), wuxing: geWuXing(tianGe), desc: GE_DESCRIPTIONS['天格'] },
        { name: '人格', value: renGe, fortune: getFortune(renGe), wuxing: geWuXing(renGe), desc: GE_DESCRIPTIONS['人格'] },
        { name: '地格', value: diGe, fortune: getFortune(diGe), wuxing: geWuXing(diGe), desc: GE_DESCRIPTIONS['地格'] },
        { name: '外格', value: waiGe, fortune: getFortune(waiGe), wuxing: geWuXing(waiGe), desc: GE_DESCRIPTIONS['外格'] },
        { name: '總格', value: zongGe, fortune: getFortune(zongGe), wuxing: geWuXing(zongGe), desc: GE_DESCRIPTIONS['總格'] },
      ],
      interpretation: generateNameInterpretation(renGe, diGe, zongGe)
    };

    return result;
  }

  function getFortune(num) {
    if (num >= 1 && num <= 81) return FORTUNE_TABLE[num];
    return '半吉';
  }

  function generateNameInterpretation(renGe, diGe, zongGe) {
    const renFortune = getFortune(renGe);
    const diFortune = getFortune(diGe);
    const zongFortune = getFortune(zongGe);

    let text = '';

    // 人格 interpretation
    if (renFortune === '吉') {
      text += '人格數理吉祥，主運勢順遂，性格穩重有魄力，一生多貴人相助。';
    } else if (renFortune === '凶') {
      text += '人格數理欠佳，主運勢多波折，宜修身養性，以正面態度面對挑戰。';
    } else {
      text += '人格數理半吉，運勢起伏不定，需把握時機，穩中求進。';
    }

    // 地格 interpretation
    if (diFortune === '吉') {
      text += '地格吉祥，青年時期運勢佳，基礎穩固，早年發展順利。';
    } else {
      text += '地格數理一般，青年時期需多努力，打好基礎。';
    }

    // 總格 interpretation
    if (zongFortune === '吉') {
      text += '總格吉祥，中晚年運勢轉佳，晚景安樂。';
    } else {
      text += '總格數理一般，晚年宜注重養生和理財。';
    }

    // 五行 relationship
    const renWx = geWuXing(renGe);
    const diWx = geWuXing(diGe);
    text += `\n\n人格五行屬${renWx}，地格五行屬${diWx}。`;

    const rel = Lunar.wxRelation(renWx, diWx);
    if (rel === 'child' || rel === 'same') {
      text += '人格與地格五行相生或相同，人際關係和諧，基礎運佳。';
    } else if (rel === 'killer' || rel === 'wealth') {
      text += '人格與地格五行相剋，需注意人際關係和健康。';
    } else {
      text += '人格與地格關係平和。';
    }

    return text;
  }

  return { calculate, getStrokes };
})();
