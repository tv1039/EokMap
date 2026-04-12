/* ═══════════════════════════════════════════
   플래너 — script.js
═══════════════════════════════════════════ */

const RING_CIRCUMFERENCE = 314.16;

let expenses         = [];
let nextId           = 1;
let scheduleAllShown = false;
let currentCountry   = 'KR';

const $ = id => document.getElementById(id);

/* ══════════════════════════════
   국가 설정
══════════════════════════════ */
const CC = {
  KR: {
    flag:'🇰🇷', title:'억맵',
    subtitle:'목표까지 가장 빠른 길',
    badge:'🎯 목표 1억원',
    target: 100_000_000, targetLabel:'1억원', currency:'원',
    incomeAlert:'월 수입을 입력해주세요.',
    unitBtns:[{l:'원',m:1},{l:'천원',m:1000},{l:'만원',m:10000},{l:'백만원',m:1000000}],
    euBtns:  [{l:'만원',m:10000},{l:'천원',m:1000},{l:'원',m:1}],
    thresholds:{ tightTight:200_000, tight:500_000 },
    expenseLabel:'항목명', expenseAmtPh:'금액',
    addItemLabel:'＋ 항목 추가',
    schedDateFmt:(y,m)=>`${y}년 ${m}월`,
    strings:{
      sectionTitle:'지금 이대로면 목표 가능할까?',
      sectionDesc:'정확한 정보를 입력할수록 더 현실적인 플랜을 드릴 수 있어요',
      cardAssets:'현재 자산', cardAssetsSub:'보유 자산 (원)',
      cardIncome:'월 수입',   cardIncomeSub:'세후 월 수입 (원)',
      cardPeriod:'목표 기간', periodLabel:'달성 목표 기간', monthsUnit:'개월',
      fixedTitle:'고정 지출', expenseTotal:'월 고정지출 합계',
      calcBtn:'📈 나의 1억 플랜 생성하기',
      ovTarget:'목표 금액', ovCurrent:'현재 자산', ovRemaining:'남은 금액',
      ovMonthly:'월 필요 저축', ovRate:'저축률',
      barSave:'저축', barFixed:'고정지출', barFree:'가용지출',
      stratHeading:'달성 전략',
      stratCertainTitle:'확실한 방법',    stratCertainSub:'저축 &amp; 절약 플랜',
      stratChallengeTitle:'도전해볼 방법', stratChallengeSub:'부업 &amp; 투자 아이디어',
      stratHopeTitle:'기대해봐야 할 방법', stratHopeSub:'고위험 &amp; 행운의 방법',
      schedHeading:'📅 월별 스케줄표',
      schedMonth:'월', schedSave:'월 저축액', schedCum:'누적 자산',
      schedPct:'달성률', schedBar:'진도',
      showAllBtn:'전체 일정 펼치기 ▼', collapseBtn:'접기 ▲',
      recalcBtn:'🔄 다시 계산하기',
      footer:'📌 이 플래너는 참고용입니다. 실제 투자 및 재무 결정은 전문가와 상담하세요.',
      expensesEmpty:'위 버튼을 눌러 고정 지출 항목을 추가하세요',
      periodPresets:['1년','2년','3년','5년','10년'],
    },
    expensePresets:[
      {icon:'🏠',label:'월세',name:'월세/관리비',amount:500000},
      {icon:'🍚',label:'식비',name:'식비',amount:400000},
      {icon:'🚌',label:'교통',name:'교통비',amount:100000},
      {icon:'📱',label:'통신',name:'통신비',amount:55000},
      {icon:'📺',label:'구독',name:'구독 서비스',amount:30000},
      {icon:'🛡️',label:'보험',name:'보험료',amount:100000},
      {icon:'💊',label:'의료',name:'의료/약국',amount:30000},
      {icon:'💪',label:'운동',name:'헬스/운동',amount:50000},
    ],
    fmt(n, short=false){
      n=Math.round(n); if(n<0) return `-${this.fmt(-n,short)}`;
      if(short){
        if(n>=100_000_000){const u=Math.floor(n/100_000_000),man=Math.round((n%100_000_000)/10_000);return man?`${u}억 ${man.toLocaleString()}만원`:`${u}억원`;}
        if(n>=10_000) return `${Math.floor(n/10_000).toLocaleString()}만원`;
        return `${n.toLocaleString()}원`;
      }
      return `${n.toLocaleString()}원`;
    },
    spendText(free,income,savingsRate){
      const f=fmt; const r=Math.round(savingsRate);
      if(free<0) return {icon:'⚠️',title:'월 수입으로 달성이 어렵습니다',cls:'bad',
        desc:`현재 월 수입(${f(income,true)})으로는 달성이 어렵습니다. 목표 기간을 늘리거나 고정지출을 줄이거나 수입을 늘려야 합니다.`};
      if(free<200_000) return {icon:'😤',title:'매우 빠듯한 계획입니다',cls:'warn',
        desc:`가용 지출이 ${f(free,true)}로 매우 적습니다. 목표 기간을 늘리거나 추가 수입을 만들어보세요.`};
      if(free<500_000) return {icon:'💪',title:'빠듯하지만 가능한 계획',cls:'warn',
        desc:`월 가용 지출 한도 ${f(free,true)}. 외식·쇼핑·취미 절약이 필요합니다. 저축률 ${r}%는 상당히 공격적입니다.`};
      return {icon:'✅',title:'달성 가능한 계획',cls:'ok',
        desc:`월 가용 지출 한도 ${f(free,true)}. 저축률 ${r}%로 꾸준히 실천하면 목표 기간 내 달성 가능합니다.`};
    },
    strategies(income,needed,fixed,months,remaining){
      const f=fmt;
      const ig1=calcFV(needed,.045/12,months)-needed*months;
      const ig2=calcFV(needed,.035/12,months)-needed*months;
      const free=Math.max(0,income-needed-fixed);
      const etf=calcFV(needed*.4,.07/12,months)-needed*.4*months;
      const savedM=Math.max(0,Math.round(months-remaining/(needed+400_000)));
      return {
        certain:[
          `<strong>월 ${f(needed,true)} 자동이체 적금</strong> — 연 4.5% 기준 이자 수익 <span class="tag-accent">+${f(ig1,true)}</span> 예상`,
          `<strong>CMA 통장 활용</strong> — 연 3.5%, 유동성 확보하며 <span class="tag-accent">+${f(ig2,true)}</span> 수익`,
          `<strong>가계부 앱 기록</strong> — 소비 패턴 파악 후 월 ${f(free*.15,true)} 절약 목표`,
          income>2_000_000
            ?`<strong>외식비 절약</strong> — 주 2회 줄이면 월 ${f(80_000,true)} 절감`
            :`<strong>무지출 챌린지</strong> — 월 4일 실천 시 월 ${f(free*.1,true)} 추가 저축`,
          fixed>1_000_000
            ?`<strong>구독 서비스 정리</strong> — 미사용 구독 해지로 월 ${f(40_000,true)} 절감`
            :`<strong>통신비 절약</strong> — 알뜰폰으로 변경 시 월 ${f(25_000,true)} 절감`,
          `<strong>비상금 통장 분리</strong> — 생활비 3개월치(${f(fixed*3,true)}) 별도 관리`,
        ],
        challenge:[
          `<strong>ETF 투자</strong> (S&P500·코스피200) — 저축액 40%를 연 7% ETF에 투자 시 <span class="tag-accent">+${f(etf,true)}</span> 추가 기대`,
          `<strong>프리랜서·재능판매</strong> — 월 30~50만원 추가 수입 시 약 <span class="tag-accent">${savedM}개월 단축</span> 가능`,
          `<strong>배달·대리운전·알바</strong> — 주말 활용, 월 50~100만원 추가 수입`,
          `<strong>블로그·유튜브 수익화</strong> — 초기 6~12개월 투자 후 월 20~100만원 패시브 인컴`,
          `<strong>중고거래</strong> — 불필요한 물건 처분, 일회성 ${f(200_000,true)}~${f(500_000,true)} 수입`,
        ],
        hope:[
          `<strong>로또</strong> — 1등 확률 1/8,145,060 (약 814만분의 1). 주 1장 기대값 약 500원 <span class="tag-accent">초고위험</span>`,
          `<strong>암호화폐 소액 투자</strong> — 총 자산의 5% 이내. 변동성 극심, 원금 손실 가능 <span class="tag-accent">투기</span>`,
          `<strong>주식 단기 매매</strong> — 개인 투자자 승률 낮음. 장기 지수 투자보다 수익률 열위 <span class="tag-accent">고위험</span>`,
          `<strong>각종 경품·이벤트</strong> — 은행·카드사 이벤트 참여, 소소한 수익 가능`,
          `<strong>스타트업 엔젤 투자</strong> — 소액 투자 플랫폼 활용, 대박 가능성과 원금 손실 위험 공존`,
        ],
      };
    },
  },

  JP: {
    flag:'🇯🇵', title:'オクメップ',
    subtitle:'目標まで最短ルートを見つけます',
    badge:'🎯 目標1000万円',
    target:10_000_000, targetLabel:'1,000万円', currency:'円',
    incomeAlert:'月収を入力してください。',
    unitBtns:[{l:'円',m:1},{l:'千円',m:1000},{l:'万円',m:10000},{l:'百万円',m:1000000}],
    euBtns:  [{l:'万円',m:10000},{l:'千円',m:1000},{l:'円',m:1}],
    thresholds:{ tightTight:20_000, tight:50_000 },
    expenseLabel:'項目名', expenseAmtPh:'金額',
    addItemLabel:'＋ 項目追加',
    schedDateFmt:(y,m)=>`${y}年${m}月`,
    strings:{
      sectionTitle:'このままで、目標いけそう？',
      sectionDesc:'正確な情報を入力するほど、より現実的なプランが作れます',
      cardAssets:'現在資産',   cardAssetsSub:'保有資産 (円)',
      cardIncome:'月収',       cardIncomeSub:'税引後月収 (円)',
      cardPeriod:'目標期間',   periodLabel:'達成目標期間', monthsUnit:'ヶ月',
      fixedTitle:'固定支出',   expenseTotal:'月固定支出合計',
      calcBtn:'📈 1000万円プランを作成する',
      ovTarget:'目標金額', ovCurrent:'現在資産', ovRemaining:'残り金額',
      ovMonthly:'月必要貯蓄', ovRate:'貯蓄率',
      barSave:'貯蓄', barFixed:'固定支出', barFree:'可処分',
      stratHeading:'達成戦略',
      stratCertainTitle:'確実な方法',    stratCertainSub:'貯蓄・節約プラン',
      stratChallengeTitle:'挑戦する方法', stratChallengeSub:'副業・投資アイデア',
      stratHopeTitle:'期待してみる方法', stratHopeSub:'高リスク・ラッキー',
      schedHeading:'📅 月別スケジュール',
      schedMonth:'月', schedSave:'月貯蓄額', schedCum:'累計資産',
      schedPct:'達成率', schedBar:'進捗',
      showAllBtn:'全期間を展開 ▼', collapseBtn:'閉じる ▲',
      recalcBtn:'🔄 再計算する',
      footer:'📌 このプランナーは参考用です。実際の投資・財務判断は専門家にご相談ください。',
      expensesEmpty:'上のボタンを押して固定支出を追加してください',
      periodPresets:['1年','2年','3年','5年','10年'],
    },
    expensePresets:[
      {icon:'🏠',label:'家賃',name:'家賃/管理費',amount:80000},
      {icon:'🍚',label:'食費',name:'食費',amount:40000},
      {icon:'🚃',label:'交通',name:'交通費',amount:10000},
      {icon:'📱',label:'通信',name:'通信費',amount:3000},
      {icon:'📺',label:'サブスク',name:'サブスク',amount:3000},
      {icon:'🛡️',label:'保険',name:'保険料',amount:15000},
      {icon:'💊',label:'医療',name:'医療費',amount:5000},
      {icon:'💪',label:'ジム',name:'ジム',amount:8000},
    ],
    fmt(n, short=false){
      n=Math.round(n); if(n<0) return `-${this.fmt(-n,short)}`;
      if(short){
        if(n>=100_000_000){const u=Math.floor(n/100_000_000),man=Math.round((n%100_000_000)/10_000);return man?`${u}億${man.toLocaleString()}万円`:`${u}億円`;}
        if(n>=10_000) return `${Math.floor(n/10_000).toLocaleString()}万円`;
        return `${n.toLocaleString()}円`;
      }
      return `${n.toLocaleString()}円`;
    },
    spendText(free,income,savingsRate){
      const f=fmt; const r=Math.round(savingsRate);
      if(free<0) return {icon:'⚠️',title:'月収では達成が困難です',cls:'bad',
        desc:`現在の月収(${f(income,true)})では達成が困難です。目標期間を延ばすか、固定費を削減するか、収入を増やしてください。`};
      if(free<20_000) return {icon:'😤',title:'非常に厳しい計画です',cls:'warn',
        desc:`可処分支出が${f(free,true)}と非常に少ないです。目標期間を延ばすか、副収入を作りましょう。`};
      if(free<50_000) return {icon:'💪',title:'厳しいですが可能な計画',cls:'warn',
        desc:`月の可処分支出上限 ${f(free,true)}。外食・買い物・趣味の節約が必要です。貯蓄率 ${r}%はかなり積極的です。`};
      return {icon:'✅',title:'達成可能な計画',cls:'ok',
        desc:`月の可処分支出上限 ${f(free,true)}。貯蓄率 ${r}%でコツコツ実践すれば目標期間内に達成可能です。`};
    },
    strategies(income,needed,fixed,months,remaining){
      const f=fmt;
      const ig1=calcFV(needed,.005/12,months)-needed*months;
      const ig2=calcFV(needed,.001/12,months)-needed*months;
      const free=Math.max(0,income-needed-fixed);
      const etf=calcFV(needed*.4,.07/12,months)-needed*.4*months;
      const savedM=Math.max(0,Math.round(months-remaining/(needed+50_000)));
      return {
        certain:[
          `<strong>月 ${f(needed,true)} 自動積立定期預金</strong> — ネット銀行 年0.5%で <span class="tag-accent">+${f(ig1,true)}</span> 利息`,
          `<strong>iDeCo・NISA活用</strong> — 税制優遇で節税、実質リターン向上`,
          `<strong>家計簿アプリ記録</strong> — 支出パターン把握で月 ${f(free*.15,true)} 節約目標`,
          income>250_000
            ?`<strong>外食費削減</strong> — 週2回減らすと月 ${f(8_000,true)} 節約`
            :`<strong>自炊チャレンジ</strong> — 週5回自炊で月 ${f(free*.1,true)} 追加貯蓄`,
          fixed>100_000
            ?`<strong>サブスク整理</strong> — 未使用サービス解約で月 ${f(3_000,true)} 節約`
            :`<strong>格安SIM乗り換え</strong> — 月 ${f(3_000,true)} 節約可能`,
          `<strong>緊急資金口座分離</strong> — 生活費3ヶ月分(${f(fixed*3,true)})を別管理`,
        ],
        challenge:[
          `<strong>つみたてNISA</strong> (S&P500全世界株式) — 貯蓄額40%を年利7%で運用 <span class="tag-accent">+${f(etf,true)}</span> 期待`,
          `<strong>クラウドソーシング副業</strong> — 月3〜10万円追加収入で約 <span class="tag-accent">${savedM}ヶ月短縮</span> 可能`,
          `<strong>メルカリ・フリマ</strong> — 不用品処分で ${f(20_000,true)}〜${f(50_000,true)} 一時収入`,
          `<strong>ブログ・YouTube収益化</strong> — 6〜12ヶ月後に月2〜20万円パッシブ収入`,
          `<strong>スキルシェア</strong> (ストアカ・ランサーズ) — 月3〜5万円`,
        ],
        hope:[
          `<strong>宝くじ(ジャンボ)</strong> — 1等確率1/2,300万。期待値は購入額の約45% <span class="tag-accent">超高リスク</span>`,
          `<strong>仮想通貨少額投資</strong> — 総資産の5%以内。元本割れリスク高 <span class="tag-accent">投機</span>`,
          `<strong>株式短期売買</strong> — 個人の約8割が損失。長期インデックスが優位 <span class="tag-accent">高リスク</span>`,
          `<strong>競馬・競輪・パチンコ</strong> — 期待値はマイナス。娯楽と割り切って少額のみ`,
          `<strong>FXレバレッジ取引</strong> — 高レバレッジは元本超え損失の可能性あり <span class="tag-accent">超高リスク</span>`,
        ],
      };
    },
  },

  US: {
    flag:'🇺🇸', title:'EokMap',
    subtitle:'Find the fastest path to your financial goal',
    badge:'🎯 Goal $100K',
    target:100_000, targetLabel:'$100,000', currency:'$',
    incomeAlert:'Please enter your monthly income.',
    unitBtns:[{l:'$1',m:1},{l:'$100',m:100},{l:'$1K',m:1000},{l:'$10K',m:10000}],
    euBtns:  [{l:'$100',m:100},{l:'$10',m:10},{l:'$1',m:1}],
    thresholds:{ tightTight:200, tight:500 },
    expenseLabel:'Category', expenseAmtPh:'Amount',
    addItemLabel:'＋ Add Item',
    schedDateFmt:(y,m)=>{
      const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${mn[m-1]} ${y}`;
    },
    strings:{
      sectionTitle:'Am I actually on track to hit my goal?',
      sectionDesc:'The more accurate your inputs, the more realistic your plan',
      cardAssets:'Current Assets', cardAssetsSub:'Assets you own ($)',
      cardIncome:'Monthly Income', cardIncomeSub:'After-tax income ($)',
      cardPeriod:'Target Timeline', periodLabel:'Goal Timeline', monthsUnit:'months',
      fixedTitle:'Fixed Expenses', expenseTotal:'Monthly Fixed Total',
      calcBtn:'📈 Create My $100K Plan',
      ovTarget:'Goal', ovCurrent:'Current Assets', ovRemaining:'Remaining',
      ovMonthly:'Monthly Savings', ovRate:'Savings Rate',
      barSave:'Savings', barFixed:'Fixed Exp.', barFree:'Discretionary',
      stratHeading:'Strategies',
      stratCertainTitle:'Proven Methods',    stratCertainSub:'Savings &amp; Frugality',
      stratChallengeTitle:'Side Hustles',    stratChallengeSub:'Income &amp; Investment Ideas',
      stratHopeTitle:'Long Shots',           stratHopeSub:'High Risk &amp; Lucky Plays',
      schedHeading:'📅 Monthly Schedule',
      schedMonth:'Month', schedSave:'Monthly Savings', schedCum:'Cumulative',
      schedPct:'Progress', schedBar:'Bar',
      showAllBtn:'Show All Months ▼', collapseBtn:'Collapse ▲',
      recalcBtn:'🔄 Recalculate',
      footer:'📌 For reference only. Consult a financial professional before making investment decisions.',
      expensesEmpty:'Tap a button above to add fixed expenses',
      periodPresets:['1yr','2yr','3yr','5yr','10yr'],
    },
    expensePresets:[
      {icon:'🏠',label:'Rent',name:'Rent/Mortgage',amount:1500},
      {icon:'🛒',label:'Food',name:'Groceries',amount:400},
      {icon:'🚗',label:'Transport',name:'Transportation',amount:300},
      {icon:'📱',label:'Phone',name:'Phone Bill',amount:70},
      {icon:'📺',label:'Subs',name:'Subscriptions',amount:50},
      {icon:'🛡️',label:'Insurance',name:'Insurance',amount:200},
      {icon:'💊',label:'Medical',name:'Medical',amount:100},
      {icon:'💪',label:'Gym',name:'Gym',amount:50},
    ],
    fmt(n, short=false){
      n=Math.round(n); if(n<0) return `-${this.fmt(-n,short)}`;
      if(short){
        if(n>=1_000_000) return `$${(n/1_000_000).toFixed(1).replace(/\.0$/,'')}M`;
        if(n>=1_000)    return `$${Math.floor(n/1_000).toLocaleString()}K`;
        return `$${n.toLocaleString()}`;
      }
      return `$${n.toLocaleString()}`;
    },
    spendText(free,income,savingsRate){
      const f=fmt; const r=Math.round(savingsRate);
      if(free<0) return {icon:'⚠️',title:'Income insufficient for this timeline',cls:'bad',
        desc:`Your income (${f(income,true)}) can't cover savings at this pace. Extend your timeline, cut fixed costs, or earn more.`};
      if(free<200) return {icon:'😤',title:'Extremely tight budget',cls:'warn',
        desc:`Only ${f(free,true)} left for discretionary spending. Consider extending your timeline.`};
      if(free<500) return {icon:'💪',title:'Tight but achievable',cls:'warn',
        desc:`Monthly discretionary limit: ${f(free,true)}. Cut dining out, streaming, and impulse buys. ${r}% savings rate is aggressive.`};
      return {icon:'✅',title:'Achievable plan',cls:'ok',
        desc:`Monthly discretionary limit: ${f(free,true)}. At a ${r}% savings rate, you'll hit your goal on schedule.`};
    },
    strategies(income,needed,fixed,months,remaining){
      const f=fmt;
      const ig1=calcFV(needed,.045/12,months)-needed*months;
      const ig2=calcFV(needed,.05/12, months)-needed*months;
      const free=Math.max(0,income-needed-fixed);
      const etf=calcFV(needed*.4,.10/12,months)-needed*.4*months;
      const savedM=Math.max(0,Math.round(months-remaining/(needed+1_000)));
      return {
        certain:[
          `<strong>Automate savings to HYSA</strong> — 4.5–5% APY, FDIC insured. Interest: <span class="tag-accent">+${f(ig1,true)}</span>`,
          `<strong>Max out 401(k) contributions</strong> — Up to $23,000/yr tax-deferred. Gain: <span class="tag-accent">+${f(ig2,true)}</span>`,
          `<strong>Track spending with YNAB/Mint</strong> — Find ${f(free*.15,true)}/mo in hidden waste`,
          income>5_000
            ?`<strong>Cut dining out</strong> — Cooking at home saves ~${f(200,true)}/month`
            :`<strong>No-spend challenge</strong> — 4 days/month saves ~${f(free*.1,true)}`,
          fixed>1_000
            ?`<strong>Audit subscriptions</strong> — Average household wastes ${f(200,true)}/mo on unused subs`
            :`<strong>Switch to budget phone plan</strong> — Save ${f(30,true)}/mo with MVNO carriers`,
          `<strong>Separate emergency fund</strong> — 3 months of expenses (${f(fixed*3,true)}) in HYSA`,
        ],
        challenge:[
          `<strong>S&P 500 index fund (Roth IRA)</strong> — $7K/yr limit, ~10% avg return. Gain: <span class="tag-accent">+${f(etf,true)}</span>`,
          `<strong>Freelancing / consulting</strong> — ${f(500,true)}–${f(2_000,true)}/mo extra = ~<span class="tag-accent">${savedM} months faster</span>`,
          `<strong>Gig economy</strong> (Uber, DoorDash, TaskRabbit) — ${f(500,true)}–${f(1_000,true)}/mo flexible`,
          `<strong>Content creation</strong> (YouTube/blog/newsletter) — Passive income after 6–12 months`,
          `<strong>Sell on eBay/Facebook Marketplace</strong> — One-time ${f(200,true)}–${f(1_000,true)}`,
        ],
        hope:[
          `<strong>Powerball</strong> — 1/292 million odds. Expected value: $0.35 per $2 ticket <span class="tag-accent">ultra high risk</span>`,
          `<strong>Crypto</strong> — Keep under 5% of portfolio. Extreme volatility, total loss possible <span class="tag-accent">speculative</span>`,
          `<strong>Day trading stocks</strong> — 80%+ of retail traders lose money vs. buy-and-hold <span class="tag-accent">high risk</span>`,
          `<strong>Options trading</strong> — Complex derivatives, can lose 100% of premium paid <span class="tag-accent">high risk</span>`,
          `<strong>Angel investing</strong> — Platforms like AngelList; huge upside but most startups fail`,
        ],
      };
    },
  },
};

/* 현재 국가 설정 헬퍼 */
function cfg()    { return CC[currentCountry]; }
function fmt(n,s) { return cfg().fmt(n,s); }
function fmtPct(n){ return `${Math.min(100, Math.round(n*10)/10)}%`; }

/* ══════════════════════════════
   단위 상태
══════════════════════════════ */
const unitModeState = {};

function _resetUnitMode(inputId, origPlaceholder) {
  const state = unitModeState[inputId];
  if (state?._btnEl) state._btnEl.classList.remove('active');
  unitModeState[inputId] = { multiplier:1, active:false, _btnEl:null, rawBuffer:'', isDefaultOne:false };
  const input = $(inputId);
  if (input && origPlaceholder != null) input.placeholder = origPlaceholder;
}

function _flushBuffer(inputEl, previewEl, state, clearBtn) {
  const raw = parseInt(state.rawBuffer) || 0;
  const eff = raw * state.multiplier;
  if (!raw) {
    inputEl.value          = '0';
    clearBtn.style.display = 'none';
    if (previewEl) previewEl.textContent = '';
  } else {
    inputEl.value          = eff.toLocaleString();
    clearBtn.style.display = 'flex';
    if (previewEl) previewEl.textContent = `≈ ${fmt(eff, true)}`;
  }
}

/* ══════════════════════════════
   주요 입력 필드 초기화
══════════════════════════════ */
function attachNumericInput(inputEl, previewEl) {
  const id   = inputEl.id;
  const orig = inputEl.placeholder;
  unitModeState[id] = { multiplier:1, active:false, _btnEl:null, rawBuffer:'', isDefaultOne:false };
  inputEl.value = '0';

  const wrapper  = inputEl.closest('.input-wrapper');
  const clearBtn = document.createElement('button');
  clearBtn.type      = 'button';
  clearBtn.className = 'input-clear-btn';
  clearBtn.textContent = '✕';
  clearBtn.setAttribute('aria-label', '입력 초기화');
  wrapper.insertBefore(clearBtn, wrapper.querySelector('.input-suffix') || null);

  clearBtn.addEventListener('click', () => {
    inputEl.value                  = '0';
    if (previewEl) previewEl.textContent = '';
    clearBtn.style.display         = 'none';
    unitModeState[id].rawBuffer    = '';
    unitModeState[id].isDefaultOne = false;
    _resetUnitMode(id, orig);
    inputEl.focus();
  });

  inputEl.addEventListener('beforeinput', e => {
    const state = unitModeState[id];
    if (!state.active) return;
    e.preventDefault();
    const buf = state.rawBuffer;
    if (e.inputType === 'insertText' && /^\d+$/.test(e.data ?? '')) {
      state.rawBuffer    = state.isDefaultOne ? e.data : buf + e.data;
      state.isDefaultOne = false;
    } else if (e.inputType === 'deleteContentBackward') {
      state.rawBuffer    = state.isDefaultOne ? '' : buf.slice(0, -1);
      state.isDefaultOne = false;
    } else if (e.inputType === 'deleteContentForward' || e.inputType === 'deleteByCut') {
      state.rawBuffer = ''; state.isDefaultOne = false;
    } else if (e.inputType === 'insertFromPaste') {
      state.rawBuffer = (e.data ?? '').replace(/[^0-9]/g, ''); state.isDefaultOne = false;
    } else if (e.inputType === 'insertFromDrop') {
      state.rawBuffer = (e.dataTransfer?.getData('text') ?? '').replace(/[^0-9]/g, ''); state.isDefaultOne = false;
    }
    _flushBuffer(inputEl, previewEl, state, clearBtn);
  });

  inputEl.addEventListener('input', () => {
    const state = unitModeState[id];
    if (state.active) return;
    const raw = inputEl.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw) || 0;
    inputEl.value          = num > 0 ? Number(raw).toLocaleString() : '0';
    clearBtn.style.display = num > 0 ? 'flex' : 'none';
    if (previewEl) previewEl.textContent = num > 0 ? `≈ ${fmt(num, true)}` : '';
  });

  inputEl.addEventListener('blur', () => {
    const state = unitModeState[id];
    if (state._btnEl) state._btnEl.classList.remove('active');
  });
}

/* ══════════════════════════════
   단위 선택 버튼 초기화
   클릭마다 현재 값에 해당 단위 더하기
══════════════════════════════ */
function initUnitBtns() {
  document.querySelectorAll('.unit-btns').forEach(group => {
    const inputId   = group.dataset.for;
    const previewId = group.dataset.preview;

    group.querySelectorAll('.unit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input   = $(inputId);
        const mult    = parseInt(btn.dataset.mult);
        const current = parseAmt(input.value);
        const newVal  = current + mult;

        input.value = newVal.toLocaleString();
        unitModeState[inputId].active       = false;
        unitModeState[inputId].rawBuffer    = '';
        unitModeState[inputId].isDefaultOne = false;

        input.closest('.input-wrapper')
             ?.querySelector('.input-clear-btn')
             ?.style.setProperty('display', 'flex');
        if (previewId) $(previewId).textContent = `≈ ${fmt(newVal, true)}`;
        flashBtn(btn);
      });
    });
  });
}

function flashBtn(btn) {
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 350);
}

/* ══════════════════════════════
   국가 전환
══════════════════════════════ */
function setCountry(code) {
  if (currentCountry === code) return;
  currentCountry = code;
  const c = cfg();
  const s = c.strings;

  /* 국가 버튼 하이라이트 */
  document.querySelectorAll('.country-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.country === code)
  );

  /* 헤더 */
  $('mainTitle').textContent    = c.title;
  $('mainSubtitle').textContent = c.subtitle;
  $('logoBadge').textContent    = c.badge;

  /* 입력 섹션 텍스트 */
  $('sectionTitle').textContent     = s.sectionTitle;
  $('sectionDesc').textContent      = s.sectionDesc;
  $('cardAssetsTitle').textContent  = s.cardAssets;
  $('cardAssetsSub').textContent    = s.cardAssetsSub;
  $('cardIncomeTitle').textContent  = s.cardIncome;
  $('cardIncomeSub').textContent    = s.cardIncomeSub;
  $('cardPeriodTitle').textContent  = s.cardPeriod;
  $('periodLabel').textContent      = s.periodLabel;
  $('monthsUnit').textContent       = s.monthsUnit;
  $('fixedTitle').textContent       = s.fixedTitle;
  $('addExpenseBtn').textContent    = c.addItemLabel;
  $('expensesTotalLabel').textContent = s.expenseTotal;
  $('calculateBtn').innerHTML       = s.calcBtn;

  /* 통화 suffix */
  document.querySelectorAll('.input-suffix').forEach(el => { el.textContent = c.currency; });

  /* 단위 버튼 레이블·mult 업데이트 */
  document.querySelectorAll('.unit-btns').forEach(group => {
    group.querySelectorAll('.unit-btn').forEach((btn, i) => {
      if (c.unitBtns[i]) {
        btn.textContent      = c.unitBtns[i].l;
        btn.dataset.mult     = c.unitBtns[i].m;
      }
    });
  });

  /* 결과 섹션 레이블 */
  $('ovTargetLabel').textContent   = s.ovTarget;
  $('ovTargetVal').textContent     = c.targetLabel;
  $('ovCurrentLabel').textContent  = s.ovCurrent;
  $('ovRemainingLabel').textContent= s.ovRemaining;
  $('ovMonthlyLabel').textContent  = s.ovMonthly;
  $('ovRateLabel').textContent     = s.ovRate;
  $('barSaveLabel').textContent    = s.barSave;
  $('barFixedLabel').textContent   = s.barFixed;
  $('barFreeLabel').textContent    = s.barFree;
  $('strategiesHeading').textContent = s.stratHeading;
  $('stratCertainTitle').textContent = s.stratCertainTitle;
  $('stratCertainSub').textContent   = s.stratCertainSub;
  $('stratChallengeTitle').textContent = s.stratChallengeTitle;
  $('stratChallengeSub').textContent   = s.stratChallengeSub;
  $('stratHopeTitle').textContent    = s.stratHopeTitle;
  $('stratHopeSub').textContent      = s.stratHopeSub;
  $('schedHeading').textContent      = s.schedHeading;
  $('schedCol1').textContent         = s.schedMonth;
  $('schedCol2').textContent         = s.schedSave;
  $('schedCol3').textContent         = s.schedCum;
  $('schedCol4').textContent         = s.schedPct;
  $('schedCol5').textContent         = s.schedBar;
  $('showAllBtn').textContent        = s.showAllBtn;
  $('recalcBtn').textContent         = s.recalcBtn;
  document.querySelector('.footer p').textContent = s.footer;
  if ($('expensesEmptyText')) $('expensesEmptyText').textContent = s.expensesEmpty;
  document.querySelectorAll('.pp-btn').forEach((btn, i) => {
    if (s.periodPresets[i]) btn.textContent = s.periodPresets[i];
  });

  /* 입력값 초기화 */
  [['currentAssets','assetsPreview'],['monthlyIncome','incomePreview']].forEach(([id, previewId]) => {
    const el = $(id); if (!el) return;
    el.value = '0';
    $(previewId) && ($(previewId).textContent = `≈ ${fmt(0)}`);
    unitModeState[id] = { multiplier:1, active:false, _btnEl:null, rawBuffer:'', isDefaultOne:false };
    el.closest('.input-wrapper')?.querySelector('.input-clear-btn')?.style.setProperty('display','none');
  });

  /* 지출 초기화 */
  expenses = [];
  renderExpensePresets();
  renderExpenses();
  updateTotal();

  /* 입력 화면으로 복귀 */
  $('results').classList.add('hidden');
  $('inputSection').classList.remove('hidden');
  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ══════════════════════════════
   지출 항목 관리
══════════════════════════════ */
function parseAmt(str) {
  return parseInt(String(str).replace(/[^0-9]/g,'')) || 0;
}

function addExpense(name='', amount=0) {
  expenses.push({ id: nextId++, name, amount });
  renderExpenses();
}
function updateExpense(id, field, value) {
  const exp = expenses.find(e => e.id === id);
  if (exp) exp[field] = value;
  updateTotal();
}
function updateTotal() {
  $('expensesTotal').textContent =
    fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0));
}

function renderExpensePresets() {
  const c   = cfg();
  const con = $('expensePresetsContainer');
  con.innerHTML = c.expensePresets.map(p =>
    `<button class="ep-btn" data-name="${escHtml(p.name)}" data-amount="${p.amount}">${p.icon} ${p.label}</button>`
  ).join('');
  con.querySelectorAll('.ep-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      if (expenses.some(e => e.name === name)) return;
      addExpense(name, parseInt(btn.dataset.amount) || 0);
      btn.classList.add('used');
    });
  });
}

function renderExpenses() {
  const list  = $('expensesList');
  const empty = $('expensesEmpty');
  const c     = cfg();

  if (expenses.length === 0) {
    list.innerHTML = '';
    list.appendChild(empty);
    empty.style.display = '';
    updateTotal();
    return;
  }
  empty.style.display = 'none';

  const existingIds = new Set(
    [...list.querySelectorAll('.expense-item')].map(el => +el.dataset.id)
  );
  const newIds = new Set(expenses.map(e => e.id));
  list.querySelectorAll('.expense-item').forEach(el => {
    if (!newIds.has(+el.dataset.id)) el.remove();
  });

  expenses.forEach(exp => {
    if (existingIds.has(exp.id)) return;

    const euBtnsHtml = c.euBtns.map(b =>
      `<button class="eu-btn" data-mult="${b.m}">${b.l}</button>`
    ).join('');

    const item = document.createElement('div');
    item.className  = 'expense-item';
    item.dataset.id = exp.id;
    item.innerHTML = `
      <input type="text" class="ei-name" placeholder="${escHtml(c.expenseLabel)}"
             value="${escHtml(exp.name)}" maxlength="20">
      <span class="item-sep"></span>
      <div class="ei-amount-group">
        <input type="text" class="ei-amount" placeholder="${escHtml(c.expenseAmtPh)}"
               inputmode="numeric" value="${exp.amount ? exp.amount.toLocaleString() : '0'}">
        <div class="ei-units">${euBtnsHtml}</div>
      </div>
      <button class="btn-remove" title="삭제">✕</button>
    `;

    const nameInput = item.querySelector('.ei-name');
    const amtInput  = item.querySelector('.ei-amount');
    const amtBuf    = { raw:'', isDefaultOne:false };

    nameInput.addEventListener('input', e => updateExpense(exp.id, 'name', e.target.value));

    amtInput.addEventListener('beforeinput', e => {
      const pending = parseInt(amtInput.dataset.pendingUnit || '1') || 1;
      if (pending === 1) return;
      e.preventDefault();
      if (e.inputType === 'insertText' && /^\d+$/.test(e.data ?? '')) {
        amtBuf.raw = amtBuf.isDefaultOne ? e.data : amtBuf.raw + e.data;
        amtBuf.isDefaultOne = false;
      } else if (e.inputType === 'deleteContentBackward') {
        amtBuf.raw = amtBuf.isDefaultOne ? '' : amtBuf.raw.slice(0, -1);
        amtBuf.isDefaultOne = false;
      } else if (e.inputType === 'deleteContentForward' || e.inputType === 'deleteByCut') {
        amtBuf.raw = ''; amtBuf.isDefaultOne = false;
      } else if (e.inputType === 'insertFromPaste') {
        amtBuf.raw = (e.data ?? '').replace(/[^0-9]/g,''); amtBuf.isDefaultOne = false;
      }
      const n = parseInt(amtBuf.raw) || 0;
      amtInput.value = (n * pending) ? (n * pending).toLocaleString() : '0';
      updateExpense(exp.id, 'amount', n * pending);
    });

    amtInput.addEventListener('input', e => {
      const pending = parseInt(amtInput.dataset.pendingUnit || '1') || 1;
      if (pending > 1) return;
      const raw  = e.target.value.replace(/[^0-9]/g,'');
      const num2 = parseInt(raw) || 0;
      e.target.value = num2 > 0 ? Number(raw).toLocaleString() : '0';
      updateExpense(exp.id, 'amount', num2);
    });

    amtInput.addEventListener('blur', () => {
      item.querySelectorAll('.eu-btn').forEach(b => b.classList.remove('active'));
    });

    item.querySelectorAll('.eu-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mult    = parseInt(btn.dataset.mult);
        const current = parseAmt(amtInput.value);
        const newVal  = current + mult;
        amtInput.value               = newVal.toLocaleString();
        amtInput.dataset.pendingUnit = '1';
        amtBuf.raw          = '';
        amtBuf.isDefaultOne = false;
        updateExpense(exp.id, 'amount', newVal);
        flashBtn(btn);
      });
    });

    item.querySelector('.btn-remove').addEventListener('click', () => {
      item.style.transition = 'opacity .15s, transform .15s';
      item.style.opacity    = '0';
      item.style.transform  = 'translateY(-4px)';
      setTimeout(() => {
        const name = exp.name;
        expenses = expenses.filter(e2 => e2.id !== exp.id);
        item.remove();
        updateTotal();
        checkExpensesEmpty();
        /* 해당 이름의 프리셋 버튼 다시 활성화 */
        document.querySelectorAll('#expensePresetsContainer .ep-btn').forEach(btn => {
          if (btn.dataset.name === name) btn.classList.remove('used');
        });
      }, 150);
    });

    list.appendChild(item);
  });

  updateTotal();
}

function checkExpensesEmpty() {
  if (expenses.length === 0) {
    const empty = $('expensesEmpty');
    empty.style.display = '';
    $('expensesList').appendChild(empty);
  }
}
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════
   계산 메인
══════════════════════════════ */
function calculate() {
  ['currentAssets','monthlyIncome'].forEach(id => $(id)?.dispatchEvent(new Event('blur')));

  const currentAssets = parseAmt($('currentAssets').value);
  const monthlyIncome = parseAmt($('monthlyIncome').value);
  const targetMonths  = Math.max(1, parseInt($('targetMonths').value) || 36);
  const totalFixed    = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const TARGET        = cfg().target;

  if (!monthlyIncome) { alert(cfg().incomeAlert); return; }

  const remaining       = Math.max(0, TARGET - currentAssets);
  const currentProgress = currentAssets / TARGET;
  const monthlyNeeded   = remaining / targetMonths;
  const maxFreeSpend    = monthlyIncome - monthlyNeeded - totalFixed;
  const savingsRate     = monthlyNeeded / monthlyIncome * 100;

  renderRing(currentProgress);
  renderOverview(currentAssets, remaining, monthlyNeeded, monthlyIncome);
  renderSpendingCard(monthlyIncome, monthlyNeeded, totalFixed, maxFreeSpend, savingsRate);
  renderStrategies(currentAssets, monthlyIncome, monthlyNeeded, totalFixed, targetMonths, remaining);
  renderSchedule(currentAssets, monthlyNeeded, targetMonths);

  $('results').classList.remove('hidden');
  $('inputSection').classList.add('hidden');
  setTimeout(() => $('results').scrollIntoView({ behavior:'smooth' }), 50);
}

/* ── 링 ── */
function getRingColor(pct100) {
  if (pct100 >= 91) return '#3ecf82';
  if (pct100 >= 61) return '#ff8c42';
  if (pct100 >= 31) return '#ffd166';
  return '#ff4d6d';
}
function renderRing(progress) {
  const pct    = Math.min(1, Math.max(0, progress));
  const pct100 = pct * 100;
  const color  = getRingColor(pct100);
  const fill   = $('ringFill');
  const pctEl  = $('ringPct');

  fill.style.strokeDashoffset = RING_CIRCUMFERENCE;
  setTimeout(() => { fill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct); }, 100);
  fill.style.stroke = color;
  pctEl.style.backgroundImage     = 'none';
  pctEl.style.webkitTextFillColor = color;
  pctEl.style.color               = color;
  pctEl.textContent               = fmtPct(pct100);
}

/* ── 통계 ── */
function renderOverview(currentAssets, remaining, monthlyNeeded, monthlyIncome) {
  $('ovTargetVal').textContent      = cfg().targetLabel;
  $('ovCurrentAssets').textContent  = fmt(currentAssets, true);
  $('ovRemaining').textContent      = fmt(remaining, true);
  $('ovMonthlySavings').textContent = fmt(monthlyNeeded, true);
  const rate = monthlyNeeded / monthlyIncome * 100;
  $('ovSavingsRate').textContent    = rate > 0 ? `${Math.round(rate)}%` : '0%';
}

/* ── 지출 한도 카드 ── */
function renderSpendingCard(income, needed, fixed, free, savingsRate) {
  const limitEl = $('spendLimitBig');
  limitEl.className = 'spend-limit-big';

  const t = cfg().spendText(free, income, savingsRate);
  $('spendIcon').textContent  = t.icon;
  $('spendTitle').textContent = t.title;
  limitEl.textContent = free < 0 ? `${fmt(-free,true)} short` : fmt(free);
  limitEl.classList.add(t.cls);
  $('spendDesc').textContent  = t.desc;

  const pSave  = Math.min(100, needed / income * 100);
  const pFixed = Math.min(100, fixed  / income * 100);
  const pFree  = Math.max(0, 100 - pSave - pFixed);

  $('barSave').style.width  = `${pSave}%`;
  $('barFixed').style.width = `${pFixed}%`;
  $('barFree').style.width  = `${pFree}%`;

  $('barSaveAmt').textContent  = fmt(needed, true);
  $('barFixedAmt').textContent = fmt(fixed,  true);
  $('barFreeAmt').textContent  = free >= 0 ? fmt(free, true) : `-${fmt(-free, true)}`;
}

/* ── 전략 카드 ── */
function renderStrategies(currentAssets, income, needed, fixed, months, remaining) {
  const st = cfg().strategies(income, needed, fixed, months, remaining);
  renderList('certainList',   st.certain);
  renderList('challengeList', st.challenge);
  renderList('hopeList',      st.hope);
}

function renderList(id, items) {
  const ul = $(id);
  ul.innerHTML = '';
  items.forEach(html => {
    const li = document.createElement('li');
    const sp = document.createElement('span');
    sp.className = 'li-content';
    sp.innerHTML = html;
    li.appendChild(sp);
    ul.appendChild(li);
  });
}

function calcFV(pmt, r, n) {
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/* ── 월별 스케줄 ── */
function renderSchedule(currentAssets, monthlyNeeded, targetMonths) {
  const tbody   = $('schedBody');
  const showBtn = $('showAllBtn');
  const PREVIEW = 12;
  const TARGET  = cfg().target;
  const s       = cfg().strings;
  const now     = new Date();
  scheduleAllShown = false;

  tbody.innerHTML = '';
  for (let i = 1; i <= targetMonths; i++) {
    const d          = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label      = cfg().schedDateFmt(d.getFullYear(), d.getMonth() + 1);
    const cumulative = Math.min(TARGET, currentAssets + monthlyNeeded * i);
    const pct        = Math.min(100, cumulative / TARGET * 100);
    const prevCum    = currentAssets + monthlyNeeded * (i - 1);
    const milestone  = getMilestone(prevCum, cumulative, TARGET);

    const tr = document.createElement('tr');
    if (milestone) tr.className = `milestone-${milestone}`;
    if (i > PREVIEW) tr.classList.add('sched-hidden');

    const badge  = milestone ? `<span class="milestone-badge">${milestoneName(milestone)}</span>` : '';
    const isFull = pct >= 99.9 ? ' full' : '';
    tr.innerHTML = `
      <td>${label}${badge}</td>
      <td>${fmt(monthlyNeeded, true)}</td>
      <td>${fmt(cumulative, true)}</td>
      <td style="color:${pctColor(pct)}">${fmtPct(pct)}</td>
      <td><div class="prog-cell">
        <div class="prog-mini"><div class="prog-mini-fill${isFull}" style="width:${pct}%"></div></div>
        <span class="prog-pct">${fmtPct(pct)}</span>
      </div></td>`;
    tbody.appendChild(tr);
  }

  document.querySelectorAll('.sched-hidden').forEach(el => { el.style.display = 'none'; });

  if (targetMonths > PREVIEW) {
    showBtn.classList.remove('hidden');
    showBtn.textContent = `${s.showAllBtn.replace('▼','').trim()} (${targetMonths}) ▼`;
    showBtn.onclick = () => {
      if (!scheduleAllShown) {
        document.querySelectorAll('.sched-hidden').forEach(el => { el.style.display = ''; });
        showBtn.textContent = s.collapseBtn;
        scheduleAllShown = true;
      } else {
        document.querySelectorAll('.sched-hidden').forEach(el => { el.style.display = 'none'; });
        showBtn.textContent = `${s.showAllBtn.replace('▼','').trim()} (${targetMonths}) ▼`;
        scheduleAllShown = false;
      }
    };
  } else {
    showBtn.classList.add('hidden');
  }
}

function getMilestone(prevCum, curCum, target) {
  for (const m of [25, 50, 75, 100]) {
    const thresh = target * m / 100;
    if (prevCum < thresh && curCum >= thresh) return m;
  }
  return null;
}
function milestoneName(m) {
  const labels = { KR:'달성!', JP:'達成!', US:'Done!' };
  const done = labels[currentCountry] || '달성!';
  return { 25:'🎖️ 25%', 50:'🏅 50%', 75:'🥈 75%', 100:`🏆 ${done}` }[m] || '';
}
function pctColor(pct) {
  if (pct >= 100) return 'var(--green)';
  if (pct >= 75)  return 'var(--blue)';
  if (pct >= 50)  return 'var(--purple2)';
  if (pct >= 25)  return 'var(--gold)';
  return 'var(--text2)';
}

/* ══════════════════════════════
   이벤트 바인딩
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  attachNumericInput($('currentAssets'), $('assetsPreview'));
  attachNumericInput($('monthlyIncome'),  $('incomePreview'));
  initUnitBtns();
  renderExpensePresets();

  /* 국가 선택 버튼 */
  document.querySelectorAll('.country-btn').forEach(btn => {
    btn.addEventListener('click', () => setCountry(btn.dataset.country));
  });

  /* 슬라이더 ↔ 숫자 */
  const range  = $('targetRange');
  const months = $('targetMonths');
  range.addEventListener('input',  () => { months.value = range.value; syncPreset(+range.value); });
  months.addEventListener('input', () => {
    const v = Math.min(240, Math.max(1, parseInt(months.value) || 1));
    range.value = Math.min(120, v); syncPreset(v);
  });
  document.querySelectorAll('.pp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = parseInt(btn.dataset.m);
      months.value = m; range.value = Math.min(120, m); syncPreset(m);
    });
  });
  function syncPreset(m) {
    document.querySelectorAll('.pp-btn').forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.m) === m)
    );
  }

  $('addExpenseBtn').addEventListener('click', () => addExpense('', 0));
  $('calculateBtn').addEventListener('click', calculate);
  $('recalcBtn').addEventListener('click', () => {
    $('results').classList.add('hidden');
    $('inputSection').classList.remove('hidden');
    window.scrollTo({ top:0, behavior:'smooth' });
  });

  /* SVG 그라디언트 */
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#7c6ff7"/>
      <stop offset="100%" stop-color="#4f96ff"/>
    </linearGradient>`;
  document.querySelector('.ring-svg')?.prepend(defs);
});
