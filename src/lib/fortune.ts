import type { IFunctionalHoroscope } from "iztro/lib/astro/FunctionalHoroscope";
import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import type { IFunctionalStar } from "iztro/lib/star/FunctionalStar";
import type { Level } from "@/lib/periods";
import { palaceName, palaceTitle, surroundedIndexes, type Astrolabe } from "@/lib/ziwei";

/**
 * 五運分析（規則式）
 *
 * 本命：看該宮主星與廟陷、生年四化（坐宮與三方四正，對宮化忌另論「沖」）、六吉六煞、祿存天馬。
 * 運限（大限、流年、流月、流日、流時）：以該層該宮所落的本命宮為底，疊上上一層四化、本層四化與流曜，
 * 並提示本宮的生年祿忌被引動。
 * 分數只是方便比較的指數，不代表吉凶的精確量化。
 */

/** 五運（官祿、財帛、夫妻、疾厄、僕役）加上擇日會用到的田宅、遷移、子女、父母、福德 */
export type AspectKey = "career" | "wealth" | "love" | "health" | "social" | "home" | "travel" | "children" | "elders" | "spirit";
/** 任一宮位的解讀（五運或其他宮位），key 可以是五運代號或宮名 */
export type Reading = Omit<AspectResult, "key"> & { key: string };
export type Tone = "good" | "bad" | "neutral";

export type Insight = { tone: Tone; text: string };

export type AspectResult = {
  key: AspectKey;
  label: string;
  /** 本命盤上被分析的宮位 */
  palaceIndex: number;
  palaceLabel: string;
  score: number;
  level: Grade;
  summary: string;
  insights: Insight[];
};

type Mutagen = "祿" | "權" | "科" | "忌";
export type Aspect = { key: AspectKey; label: string; palace: string; noun: string };

/** 五運：命盤頁與運勢頁的五大面向 */
export const ASPECTS: readonly Aspect[] = [
  { key: "career", label: "事業運", palace: "官祿", noun: "工作" },
  { key: "wealth", label: "財運", palace: "財帛", noun: "財務" },
  { key: "love", label: "感情運", palace: "夫妻", noun: "感情" },
  { key: "health", label: "健康運", palace: "疾厄", noun: "健康" },
  { key: "social", label: "人際運", palace: "僕役", noun: "人際" },
];

/** 擇日另外會看的五個宮位：搬家看田宅、出行看遷移、求子看子女、考試文書看父母、祈福心境看福德 */
export const EXTRA_ASPECTS: readonly Aspect[] = [
  { key: "home", label: "家宅運", palace: "田宅", noun: "家宅" },
  { key: "travel", label: "出行運", palace: "遷移", noun: "出行" },
  { key: "children", label: "子女運", palace: "子女", noun: "子女" },
  { key: "elders", label: "長輩文書運", palace: "父母", noun: "長輩與文書" },
  { key: "spirit", label: "福德運", palace: "福德", noun: "心境" },
];

export const ALL_ASPECTS: readonly Aspect[] = [...ASPECTS, ...EXTRA_ASPECTS];
export const aspectByKey = (key: string) => ALL_ASPECTS.find((a) => a.key === key);

/* ───────────── 主星 ───────────── */

/** 接在「某宮見某星，」之後的描述。夫妻宮描述另一半與相處，僕役宮描述朋友 */
export const MAJOR_TRAITS: Record<string, Record<AspectKey, string>> = {
  紫微: {
    career: "有領導格局，適合管理、主導的位置，也在意頭銜與舞台。",
    wealth: "財運格局大，重視資產規劃，花錢也講究體面。",
    love: "另一半多半有主見、有能力，也愛面子，相處時互相給台階就順了。",
    health: "脾胃、消化系統較需要留意，壓力一大容易反映在腸胃。",
    social: "朋友中不乏有能力、有地位的人，但他們不見得聽你的，相處時放下身段比較好。",
    home: "重視居家的氣派與品味，住處多半體面，置產眼光高，也願意為好房子花錢。",
    travel: "在外受人尊重，出門容易遇到貴人，適合往外發展與開拓。",
    children: "子女有主見、自尊心強，教養宜多鼓勵、少命令。",
    elders: "父母或長官有地位、個性強，家教較嚴，向上溝通要有條理。",
    spirit: "精神層次高，重視品味與自我實現，心情好壞常繫於是否受到尊重。",
  },
  天機: {
    career: "腦筋動得快，擅長企劃、分析，幕僚、技術或需要變通的工作最適合。",
    wealth: "靠專業和腦袋賺錢，收入變動較多，適合做好規劃，不宜投機。",
    love: "另一半聰明、反應快，但想法多變，感情要多溝通，年紀差距大一點反而合適。",
    health: "要注意肝膽、神經緊繃與失眠，手腳也容易有小傷。",
    social: "朋友多屬點頭之交，來來去去，真正深交的不多。",
    home: "住處容易變動，搬家、換環境的次數比別人多，適合靈活的租屋或換屋規劃。",
    travel: "常往外跑，行程多變，出門前把計畫排好會順很多。",
    children: "子女聰明伶俐、反應快，但情緒較敏感，相處要有耐心。",
    elders: "與長輩的想法常有落差，文件往返多，溝通要有耐心。",
    spirit: "心思多、容易想東想西，適合用靜心、閱讀來安定情緒。",
  },
  太陽: {
    career: "做事熱心、肯付出，適合公職、教育、傳播這類面對人群的工作。",
    wealth: "名大於利，錢常因人情和付出而流動，先把名聲做起來，財自然跟著來。",
    love: "另一半熱情外向、樂於付出，只是常忙於外務，要多留時間給彼此。",
    health: "留意眼睛、血壓與心血管，別長期操勞。",
    social: "交遊廣闊，朋友都很熱心，只是你付出的常比收回來的多。",
    home: "家中明亮熱鬧、人來人往，適合住採光好的房子，置產多半靠自己打拚。",
    travel: "出外人緣好、名聲響，往外發展或出差都容易有收穫。",
    children: "子女活潑外向、熱心，長子女的表現較突出。",
    elders: "與父親、男性長官緣分較深，容易得到公開的肯定。",
    spirit: "樂觀開朗、閒不下來，忙碌反而讓心情踏實。",
  },
  武曲: {
    career: "執行力強、做事果斷，適合財經、金融、技術或需要拍板決策的職務。",
    wealth: "正財星入財帛，理財能力好，靠實力和紀律累積財富。",
    love: "另一半個性剛直務實，不太會說好聽話，晚一點定下來感情較穩。",
    health: "呼吸道、肺部，以及牙齒骨骼是要顧的地方。",
    social: "朋友不多但實在，錢財往來最好一開始就講清楚。",
    home: "能靠實力置產，不動產有增值的機會，但買賣時要精算，別只看價格。",
    travel: "在外能靠實力打出一片天，出門求財有利，但行程會比較緊湊。",
    children: "子女個性剛強獨立，管教上容易有衝突，講道理比講規矩有效。",
    elders: "父母務實嚴格，與長官講求績效，文書與契約要精確。",
    spirit: "勞心勞力，快樂來自實際的成就感，要提醒自己適時放鬆。",
  },
  天同: {
    career: "個性溫和、不愛爭，服務、協調或步調穩定的工作做得最自在。",
    wealth: "多半是白手起家、先難後易，進財平順，但別因為安逸而忘了存錢。",
    love: "另一半溫和好相處，感情生活舒服自在，但也別因此少了經營。",
    health: "留意泌尿系統與水分代謝，飲食作息規律最要緊。",
    social: "朋友多、氣氛和樂，彼此能互相照應。",
    home: "家庭氣氛和樂，住得舒服比住得大重要，晚年多能安居。",
    travel: "出外平順、有口福，旅途多半輕鬆愉快。",
    children: "子女乖巧貼心，親子相處愉快，也容易得子女緣。",
    elders: "父母慈祥，與長輩相處融洽，辦事多半有人幫忙。",
    spirit: "天同是福德主，懂得享受生活，福氣深厚，心情容易滿足。",
  },
  廉貞: {
    career: "企圖心強，懂得手腕，公關、策略或專業技術領域都有發揮空間。",
    wealth: "錢財多靠能力與交際手腕得來，收支起伏大，要懂得控管風險。",
    love: "感情濃烈、愛恨分明，宜理性經營，避免占有慾太強。",
    health: "要注意血液循環與免疫系統，生殖泌尿方面也要多保養。",
    social: "人脈廣但複雜，交友要挑，避免捲進是非。",
    home: "居家環境變化多，家人之間偶有摩擦，裝潢與搬遷要先把意見談好。",
    travel: "在外交際應酬多，人際與消費都要拿捏分寸。",
    children: "子女個性鮮明、有主見，需要耐心溝通與陪伴。",
    elders: "與父母、長官關係時好時壞，文件與法規要特別小心。",
    spirit: "內心情緒起伏大，需要找到抒發的管道，避免悶在心裡。",
  },
  天府: {
    career: "穩重能守成，擅長行政管理、整合資源，在大機構裡容易穩定發展。",
    wealth: "財庫星入財帛，善於守財、累積，財務底子穩。",
    love: "另一半穩重顧家、重承諾，感情穩定。",
    health: "脾胃要顧，飲食別過量。",
    social: "朋友穩重可靠，人脈可以長期經營。",
    home: "財庫穩、家底厚，容易累積不動產，適合長期持有。",
    travel: "出外穩當，容易得到資源與照應，行程安排宜從容。",
    children: "子女穩重懂事，將來能有所成，親子關係穩定。",
    elders: "父母穩重、有照顧能力，能得到家庭庇蔭，文書順利。",
    spirit: "心態穩定知足，遇事不慌，晚年享福。",
  },
  太陰: {
    career: "心思細、有耐性，適合規劃、財務、設計、不動產或幕後工作。",
    wealth: "適合穩定累積或投資不動產，財富隨時間慢慢增加。",
    love: "另一半溫柔細膩、重視感受，感情生活浪漫，偶爾會多愁善感。",
    health: "留意腎臟、內分泌與睡眠品質。",
    social: "朋友相處溫和，較容易得到女性朋友或長輩的幫忙。",
    home: "太陰是田宅主，置產運佳，講究居家舒適與美感，適合投資住宅。",
    travel: "在外表現得體，適合到外地安定發展，夜間出行要多留意。",
    children: "子女溫柔細膩，與母親較親近，女兒緣較明顯。",
    elders: "與母親、女性長官緣分較深，辦理證件宜細心。",
    spirit: "內心細膩浪漫，重視精神上的滿足，容易多愁善感。",
  },
  貪狼: {
    career: "多才多藝、交際手腕好，業務、娛樂、創意產業或斜槓發展都適合。",
    wealth: "財路多元，偏財機會不少，但慾望也大，花錢要有節制。",
    love: "感情生活多采多姿，異性緣好，要守住界線。",
    health: "肝腎與生殖系統要留意，應酬多、作息亂的時候特別容易出狀況。",
    social: "交遊廣、應酬多，酒肉朋友也不少，要分清誰是真心。",
    home: "喜歡熱鬧、講究享受的住處，置產多靠後天努力，也容易為裝修多花錢。",
    travel: "在外機會與誘惑都多，交遊廣闊，行程容易一再追加。",
    children: "子女多才多藝、愛玩，需要引導專注，也主創意與才藝。",
    elders: "父母交遊廣闊，與長輩相處要拿捏分寸，申請事項容易節外生枝。",
    spirit: "興趣廣泛、愛享受，物質慾望較強，心情常隨玩樂起伏。",
  },
  巨門: {
    career: "口才和研究能力好，教學、法律、諮詢、業務這類靠說話的工作最能發揮。",
    wealth: "靠口才或專業進財，簽約、合作條款要看清楚，避免因口舌糾紛破財。",
    love: "兩人容易因為一句話起誤會，多聽少辯，關係會順很多。",
    health: "口腔、腸胃與呼吸道要多照顧。",
    social: "朋友間容易有口舌是非，說話留三分。",
    home: "家中容易有口舌，買房、租屋的合約與鄰居關係都要多留心。",
    travel: "在外容易遇到口舌是非，溝通與文件都要說清楚、看仔細。",
    children: "親子之間容易有代溝，多傾聽、少說教。",
    elders: "與父母、長官容易有口角或代溝，文書容易出錯，要多檢查。",
    spirit: "容易煩惱多、想不開，宜多與人交流，別一個人鑽牛角尖。",
  },
  天相: {
    career: "做事公正負責，擅長協調，行政、秘書、公關或輔佐角色都很稱職。",
    wealth: "財運平穩，重視信用與規劃，適合穩健理財。",
    love: "另一半體貼、重和諧，兩人相處相敬如賓。",
    health: "留意皮膚與泌尿系統。",
    social: "人際和諧，常扮演居中協調的角色。",
    home: "居家整潔有序，有機會繼承或分得家產，置產宜穩健。",
    travel: "在外能得到信任，適合代表出面協調或洽談。",
    children: "子女懂事守規矩，親子關係和諧。",
    elders: "父母講道理，與長官關係不錯，文件與印鑑之事順利。",
    spirit: "心態平和，重視生活的秩序與品味，心情穩定。",
  },
  天梁: {
    career: "有長者風範，喜歡照顧人，醫療、教育、顧問或監察類工作很合適。",
    wealth: "錢財多因專業或名聲而來，不宜投機，也盡量別替人作保。",
    love: "另一半成熟、會照顧人，兩人年紀可能差得多一些，相處時別互相說教。",
    health: "腸胃與慢性疲勞要注意，不過天梁本身有逢凶化吉的味道。",
    social: "有長輩緣，也常照顧晚輩，朋友有事常會找你幫忙。",
    home: "容易得到祖產或長輩的幫助，住處穩定，適合住離長輩近的地方。",
    travel: "出門常有貴人照顧，遇事能逢凶化吉，長途旅行也較安穩。",
    children: "子女早熟懂事，你也很會照顧晚輩，求子多有長輩相助。",
    elders: "長輩緣極佳，常得長官與前輩提攜，考試、申請多有貴人。",
    spirit: "心胸寬大，對宗教、哲學有興趣，福氣好，遇事能看得開。",
  },
  七殺: {
    career: "衝勁足、敢開創，適合有挑戰性、需要獨當一面的工作。",
    wealth: "財運起伏大，敢衝敢拚，記得設停損，別孤注一擲。",
    love: "兩人個性都強，感情來得快也容易起衝突，晚婚較穩。",
    health: "呼吸道要顧，也要小心意外與運動傷害。",
    social: "朋友個性多半很強，合作時容易起衝突，最好各司其職。",
    home: "早年住處變動大，靠自己打拚才置產，搬家常帶著一番新局。",
    travel: "在外奔波辛勞，適合到外地闖蕩，但行程別排得太滿。",
    children: "子女個性強、有主見，宜給他們發展的空間，懷孕期間要多保養。",
    elders: "與父母、長官個性都強，容易有衝突，文件往來要果斷處理。",
    spirit: "內心不安定、閒不下來，總想追求挑戰，要學會與自己相處。",
  },
  破軍: {
    career: "不怕變動、敢打破常規，適合開創、改革或變化快的環境。",
    wealth: "財來財去、先破後成，建立儲蓄習慣比什麼都重要。",
    love: "感情起伏較大、聚散分明，宜晚婚，在穩定中找新鮮感。",
    health: "泌尿生殖系統與消耗性的毛病要留意，作息宜規律。",
    social: "朋友圈變動大，新舊交替快，要珍惜老朋友。",
    home: "不動產先破後成，買賣與搬遷較頻繁，舊屋翻新反而有利。",
    travel: "出外變動大，容易臨時改行程，適合離鄉開創新局。",
    children: "子女個性叛逆、愛冒險，親子互動起伏較大。",
    elders: "與父母緣分起伏，早年家庭可能有變動，文書容易反覆修改。",
    spirit: "想法多變，喜歡新鮮刺激，心情容易大起大落。",
  },
};

/** 流年用：主星帶來的年度基調，接在「今年某某上」之後 */
const YEARLY_TONE: Record<string, string> = {
  紫微: "容易受到重視，也有主導權",
  天機: "變動多，需要動腦規劃",
  太陽: "忙碌，曝光的機會也多",
  武曲: "講求實際，看重績效",
  天同: "步調會放慢，輕鬆一些",
  廉貞: "人際周旋多，壓力不小",
  天府: "以穩定、守成為主",
  太陰: "細水長流，慢慢累積",
  貪狼: "機會多，應酬也多",
  巨門: "溝通要多用心，小心口舌是非",
  天相: "多半在協調、配合別人",
  天梁: "有人照顧，但責任也重",
  七殺: "挑戰多，需要拿出衝勁",
  破軍: "變動大，有汰舊換新的味道",
};

const HEALTH_PARTS: Record<string, string> = {
  紫微: "脾胃", 天機: "肝膽與神經", 太陽: "眼睛與心血管", 武曲: "呼吸道與骨骼",
  天同: "泌尿系統", 廉貞: "血液循環與免疫", 天府: "脾胃", 太陰: "腎臟與內分泌",
  貪狼: "肝腎", 巨門: "腸胃與口腔", 天相: "皮膚與泌尿", 天梁: "腸胃",
  七殺: "呼吸道，也要小心意外", 破軍: "泌尿生殖系統",
};

const BRIGHT_GOOD: Record<AspectKey, string> = {
  career: "能力容易被看見",
  wealth: "賺錢的本事發揮得出來",
  love: "感情中好的一面容易展現",
  health: "身體底子不錯",
  social: "和朋友的好緣分容易顯現",
  home: "家宅安穩，置產的眼光好",
  travel: "出門順利，在外容易有收穫",
  children: "子女緣分深，親子關係順",
  elders: "長輩緣好，文書辦事順利",
  spirit: "心境開闊，福分厚",
};
const BRIGHT_BAD: Record<AspectKey, string> = {
  career: "能力要多花些力氣才會被看見",
  wealth: "賺錢要比別人辛苦一些",
  love: "感情裡好的一面不容易展現，需要多用心",
  health: "體質相對弱一點，平時要多保養",
  social: "朋友的助力會打些折扣",
  home: "家宅容易有變動，置產要多評估",
  travel: "出門較辛勞，行程要多準備",
  children: "子女緣要多用心經營",
  elders: "與長輩的互動要多費心，文件要多檢查",
  spirit: "心情容易低落，要多照顧自己的情緒",
};

/* ───────────── 四化 ───────────── */

/** 前面加「今年」也要通順，流年會直接沿用 */
export const MUTAGEN_TEXT: Record<Mutagen, Record<AspectKey, string>> = {
  祿: {
    career: "工作上機會多，做得順手，也有實質回報。",
    wealth: "財源順，賺錢的機會常主動找上門。",
    love: "感情甜蜜，另一半能帶來好運與助力。",
    health: "心寬體胖，身體底子不錯，飲食倒是要節制。",
    social: "朋友對你有幫助，人脈能帶來財與機會。",
    home: "置產運好，家中容易有進帳，搬家入宅也順利。",
    travel: "出外有財有機會，出門容易遇到好事。",
    children: "與子女緣分深，求子、育兒都順，晚輩是你的福氣。",
    elders: "得父母、長輩疼愛與資助，考試、申請、文書都順利。",
    spirit: "懂得享福，心情容易滿足，做事有福氣相隨。",
  },
  權: {
    career: "有掌權、升遷的機會，適合承擔更大的責任。",
    wealth: "賺錢積極，敢投入，也抓得住主導權。",
    love: "相處中容易爭主導權，彼此多尊重就好。",
    health: "精力旺盛，但容易硬撐，不舒服也不愛休息。",
    social: "在朋友圈說話有份量，但別讓人覺得太強勢。",
    home: "對家中事務有主導權，適合投資不動產或主導裝修。",
    travel: "在外有影響力，出門辦事說話有份量。",
    children: "子女有主見，教養上容易爭主導，要多尊重。",
    elders: "父母或長官較強勢，申請與文件要照規矩來。",
    spirit: "對自己要求高、閒不下來，心裡總有事要忙。",
  },
  科: {
    career: "做事有口碑，容易受到賞識或有貴人提拔。",
    wealth: "進財平穩，不見得大富，但財務有條理、少有大虧。",
    love: "感情相處斯文有禮，彼此重視品味與形象。",
    health: "有病能遇良醫，有逢凶化吉之象。",
    social: "往來的朋友素質好，口碑也不錯。",
    home: "居家環境整潔有質感，置產與租賃過程平順。",
    travel: "在外有好名聲，出門辦事受人禮遇。",
    children: "子女聰明，讀書運不錯，親子相處斯文。",
    elders: "與長輩關係和諧，證件、文書、考試都順利。",
    spirit: "心態平和、有修養，遇事能沉得住氣。",
  },
  忌: {
    career: "工作比較勞心，容易付出多、回報慢，換跑道要謹慎。",
    wealth: "錢來得辛苦，對錢也看得比較重，周轉、借貸要特別小心。",
    love: "對感情比較執著，容易鑽牛角尖，有話直說比悶著好。",
    health: "身體有弱點要照顧，壓力一大就容易反映在身上。",
    social: "容易為朋友操心或被拖累，金錢往來要分清楚。",
    home: "家宅容易有煩惱，置產、搬家、裝修都要多評估，合約看仔細。",
    travel: "在外容易遇到阻礙或是非，出遠門要注意安全與行程變動。",
    children: "為子女操心較多，或子女緣較晚，求子要有耐心。",
    elders: "與父母、長官容易有心結，文書證件容易出錯，送件要多檢查。",
    spirit: "容易鑽牛角尖、想不開，心情悶，要多找人聊聊。",
  },
};

/** 三方四正會到祿權科 */
const AROUND_GOOD: Record<AspectKey, string> = {
  career: "工作上有外力相助",
  wealth: "財源上有外力相助",
  love: "感情上多了助力",
  health: "身體多一層保護",
  social: "人際上有加分",
  home: "家宅上有外力相助",
  travel: "出門在外多了助力",
  children: "子女方面多了助力",
  elders: "長輩與文書上有加分",
  spirit: "心境上多一層福分",
};

/** 流年走到有生年祿、忌的宮位 */
const NATAL_LU_TRIGGERED: Record<AspectKey, string> = {
  career: "工作上容易遇到好機會",
  wealth: "財務上容易有進帳的機會",
  love: "感情上容易有好的發展",
  health: "身體狀況比較有餘裕",
  social: "人際上容易得到助力",
  home: "家宅、置產上容易有好消息",
  travel: "出門在外容易遇到好機會",
  children: "子女方面容易有好的發展",
  elders: "長輩與文書上容易得到助力",
  spirit: "心情與福分都比較有餘裕",
};
const NATAL_JI_TRIGGERED: Record<AspectKey, string> = {
  career: "工作上的老問題容易浮現",
  wealth: "財務上的老問題容易浮現",
  love: "感情裡的老心結容易浮現",
  health: "身體的老毛病要多留意",
  social: "人際上的老問題容易浮現",
  home: "家宅的老問題容易浮現",
  travel: "出外的老問題容易重演",
  children: "子女方面的老問題容易浮現",
  elders: "與長輩或文書上的老問題容易浮現",
  spirit: "心裡的老心結容易浮現",
};

/** 化忌在對宮，稱為「沖」 */
const CHONG_TEXT: Record<AspectKey, string> = {
  career: "工作上容易受外在環境牽動，計畫常被打亂。",
  wealth: "錢財容易因外在因素流失，手頭要留些緩衝。",
  love: "感情容易受外力干擾，彼此要多一點信任。",
  health: "身體容易因環境或壓力出狀況，別忽略小毛病。",
  social: "容易受朋友連累，或被捲入別人的是非。",
  home: "家宅容易受外在因素牽動，搬遷、裝修的計畫常被打亂。",
  travel: "出門容易受外力干擾，行程變動多，注意安全。",
  children: "子女的事容易受外力牽動，要多陪伴。",
  elders: "與長輩、文書的事容易被外在因素打亂，文件多備一份。",
  spirit: "心情容易被外在環境牽動，別把壓力往心裡放。",
};

/* ───────────── 輔星 ───────────── */

const LUCUN_TEXT: Record<AspectKey, string> = {
  career: "祿存在官祿，工作穩定，收入有保障。",
  wealth: "祿存在財帛，善於存錢，財庫穩。",
  love: "祿存在夫妻，另一半務實保守，懂得持家。",
  health: "祿存在疾厄，體質還算穩，但兩旁有擎羊、陀羅夾著，小病別拖。",
  social: "祿存在交友宮，朋友務實，但多半先顧自己，別期待太多。",
  home: "祿存在田宅，家底穩、守得住產業，適合長期持有不動產。",
  travel: "祿存在遷移，出外求財有利，在外多半不缺資源。",
  children: "祿存在子女，子女務實、有財運，親子關係穩定。",
  elders: "祿存在父母，長輩務實、能給實際的幫助，文書辦事穩當。",
  spirit: "祿存在福德，有福氣、能享受，但兩旁羊陀夾著，心情要自己放寬。",
};

const TIANMA_TEXT: Record<AspectKey, string> = {
  career: "天馬在官祿，工作常要奔波、出差或外派。",
  wealth: "天馬在財帛，動中求財，越跑越有。",
  love: "天馬在夫妻，感情與遠方有緣，聚少離多時要多聯繫。",
  health: "天馬在疾厄，常常奔波勞碌，記得讓身體休息。",
  social: "天馬在交友宮，朋友多在外地，或是因工作往來而結識。",
  home: "天馬在田宅，住處容易變動，常搬家或在兩地往返。",
  travel: "天馬在遷移，常常在外奔走、出差或遠行，動中有機會。",
  children: "天馬在子女，子女好動、常在外地，或聚少離多。",
  elders: "天馬在父母，與長輩聚少離多，文書往返奔波。",
  spirit: "天馬在福德，心靜不下來，愛往外跑，動一動心情才好。",
};

const HEALTH_TOUGH: Record<string, string> = {
  擎羊: "外傷或開刀",
  陀羅: "拖得久的慢性毛病",
  火星: "發炎與急症",
  鈴星: "突發的小病痛",
  地空: "說不出原因的不適",
  地劫: "說不出原因的不適",
};

const PAIRS = { 輔弼: ["左輔", "右弼"], 昌曲: ["文昌", "文曲"], 魁鉞: ["天魁", "天鉞"] };

/* ───────────── 等級總評 ───────────── */

export const GRADES = [
  { min: 80, label: "極佳" },
  { min: 65, label: "良好" },
  { min: 45, label: "平穩" },
  { min: 30, label: "稍弱" },
  { min: 0, label: "需留意" },
] as const;
export type Grade = (typeof GRADES)[number]["label"];

export function gradeOf(score: number): Grade {
  return GRADES.find((g) => score >= g.min)!.label;
}

/**
 * 五運平均的等級。平均值會往中間集中（實測多落在 52–65），
 * 所以另用一組門檻，讓整體評語仍分得出高低。
 */
const OVERALL_GRADES: { min: number; label: Grade }[] = [
  { min: 65, label: "極佳" },
  { min: 61, label: "良好" },
  { min: 56, label: "平穩" },
  { min: 52, label: "稍弱" },
  { min: 0, label: "需留意" },
];

export function overallOf(results: Reading[]) {
  const score = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  return { score, grade: OVERALL_GRADES.find((g) => score >= g.min)!.label };
}

export function overallGradeOf(score: number): Grade {
  return OVERALL_GRADES.find((g) => score >= g.min)!.label;
}

const NATAL_SUMMARY: Record<AspectKey, Record<Grade, string>> = {
  career: {
    極佳: "事業格局好，有能力也有舞台，可以往上爭取。",
    良好: "工作運不錯，肯做就看得到成果。",
    平穩: "事業平平順順，靠一步步累積往上走。",
    稍弱: "工作上的助力少，很多事得自己多扛一點。",
    需留意: "事業起伏較大，換跑道或做大決定前多想一步。",
  },
  wealth: {
    極佳: "財運佳，有賺錢的眼光，也守得住。",
    良好: "財運不錯，收入穩定，理財得當還能再累積。",
    平穩: "收支大致平衡，守財比求財重要。",
    稍弱: "錢財來得辛苦，開源之外更要節流。",
    需留意: "財務起伏大，投資、借貸都要保守。",
  },
  love: {
    極佳: "感情緣分好，容易遇到合拍的對象。",
    良好: "感情大致和諧，用心經營就能長久。",
    平穩: "感情平淡中見真實，需要兩人花時間經營。",
    稍弱: "感情上波折較多，溝通方式是關鍵。",
    需留意: "感情容易卡關，別急著做決定，晚一點定下來較穩。",
  },
  health: {
    極佳: "底子好，精神體力都不錯。",
    良好: "身體大致健康，維持好作息就好。",
    平穩: "健康普通，小毛病要早點處理。",
    稍弱: "體力容易透支，記得給自己休息的時間。",
    需留意: "身體需要多照顧，定期檢查不能省。",
  },
  social: {
    極佳: "人緣好，朋友多，也幫得上忙。",
    良好: "人際關係融洽，關鍵時刻有人挺。",
    平穩: "人際普通，交情需要時間累積。",
    稍弱: "朋友的助力有限，借錢、合夥要小心。",
    需留意: "容易被朋友拖累或捲入是非，交友要挑。",
  },
  home: {
    極佳: "家運興旺，置產運佳，住得安穩又有進帳。",
    良好: "居家安穩，有置產機會。",
    平穩: "家宅平穩，置產量力而為。",
    稍弱: "居家容易有變動，買房、搬家前多評估。",
    需留意: "家宅事務容易煩心，不動產投資要保守。",
  },
  travel: {
    極佳: "出外發展順利，適合往外闖。",
    良好: "在外人緣好，機會不少。",
    平穩: "在外表現平穩。",
    稍弱: "出外辛勞，凡事多準備。",
    需留意: "在外容易遇到阻礙，出行要多注意。",
  },
  children: {
    極佳: "子女緣深，晚輩能帶來福氣。",
    良好: "親子關係融洽。",
    平穩: "親子關係平穩，需要用心經營。",
    稍弱: "子女需要多花心力照顧。",
    需留意: "為子女操心多，溝通要更有耐心。",
  },
  elders: {
    極佳: "長輩緣極佳，常得提攜，文書考試都順。",
    良好: "與父母、長官相處融洽。",
    平穩: "與長輩關係平穩。",
    稍弱: "與長輩的想法容易有落差，文件要多檢查。",
    需留意: "與父母或長官容易有心結，文書證件要特別仔細。",
  },
  spirit: {
    極佳: "心靈富足，福分厚，懂得享受人生。",
    良好: "心態不錯，能找到生活樂趣。",
    平穩: "精神生活平穩。",
    稍弱: "容易操心，要多照顧自己的情緒。",
    需留意: "內心壓力較大，建議培養紓壓的習慣。",
  },
};

/** 大限、流年、流月用，{p} 代入「這十年／今年／這個月」 */
const PERIOD_SUMMARY: Record<AspectKey, Record<Grade, string>> = {
  career: {
    極佳: "{p}工作運旺，有表現機會就主動爭取。",
    良好: "{p}工作順手，努力容易被看見。",
    平穩: "{p}工作大致平穩，適合把基本功做紮實。",
    稍弱: "{p}工作阻力多一些，先求穩再求進。",
    需留意: "{p}工作變數大，重大決定多聽幾個人的意見。",
  },
  wealth: {
    極佳: "{p}財運亮眼，可以積極規劃。",
    良好: "{p}收入不錯，有餘力可以存一筆。",
    平穩: "{p}財務平穩，照計畫走就好。",
    稍弱: "{p}開銷容易變大，花錢前先想一下。",
    需留意: "{p}財務壓力較大，避免投機、借貸與作保。",
  },
  love: {
    極佳: "{p}感情運旺，單身的人有機會遇到好對象。",
    良好: "{p}感情穩定，適合一起安排些新計畫。",
    平穩: "{p}感情平淡，多一點相處時間就有溫度。",
    稍弱: "{p}感情容易有摩擦，有話好好說。",
    需留意: "{p}感情考驗多，遇到爭執先冷靜再談。",
  },
  health: {
    極佳: "{p}精神好、體力足。",
    良好: "{p}身體狀況不錯，保持運動習慣。",
    平穩: "{p}健康普通，作息規律最重要。",
    稍弱: "{p}容易累，別硬撐。",
    需留意: "{p}要特別注意身體，有不適盡早就醫。",
  },
  social: {
    極佳: "{p}貴人多，多參加聚會有好處。",
    良好: "{p}人際順，合作機會不少。",
    平穩: "{p}人際平平，維持好舊交情就好。",
    稍弱: "{p}人際小摩擦多，說話留點餘地。",
    需留意: "{p}容易因人受累，借錢、作保、合夥都避開。",
  },
  home: {
    極佳: "{p}家運旺，搬家、置產都有好機會。",
    良好: "{p}居家安穩，家中有好消息。",
    平穩: "{p}家宅平穩，照計畫過日子就好。",
    稍弱: "{p}家中容易有小變動，買賣房產先緩一緩。",
    需留意: "{p}家宅事務煩心，搬遷與不動產買賣要保守。",
  },
  travel: {
    極佳: "{p}出門運旺，往外跑機會多。",
    良好: "{p}出外順利，在外容易有收穫。",
    平穩: "{p}在外平平，照常往來就好。",
    稍弱: "{p}出門辛勞，行程多留彈性。",
    需留意: "{p}出遠門要特別注意安全，行程容易生變。",
  },
  children: {
    極佳: "{p}子女緣旺，求子、親子關係都順。",
    良好: "{p}親子互動好，子女有好表現。",
    平穩: "{p}子女方面平穩。",
    稍弱: "{p}為子女多費心，溝通要有耐心。",
    需留意: "{p}子女的事容易讓人操心，多陪伴、少責備。",
  },
  elders: {
    極佳: "{p}長輩運旺，考試、申請、文書都順。",
    良好: "{p}長輩相助，辦事順利。",
    平穩: "{p}與長輩的互動平穩。",
    稍弱: "{p}與長輩容易意見不合，文件要多檢查。",
    需留意: "{p}與父母或長官容易有心結，文書證件特別小心。",
  },
  spirit: {
    極佳: "{p}福分厚、心情好，做什麼都有勁。",
    良好: "{p}心情不錯，可以安排些讓自己開心的事。",
    平穩: "{p}心境平穩。",
    稍弱: "{p}容易煩心，要留時間給自己。",
    需留意: "{p}心情容易低落，別一個人悶著，找人聊聊。",
  },
};

/** 流日、流時用：偏向擇日、擇時的建議 */
const DAY_SUMMARY: Record<AspectKey, Record<Grade, string>> = {
  career: {
    極佳: "{p}適合提案、談判，處理重要公事。",
    良好: "{p}做事順手，可以推進進度。",
    平穩: "{p}照常處理例行公事即可。",
    稍弱: "{p}做事容易卡關，重要的事可以緩一緩。",
    需留意: "{p}不宜做重大的工作決定。",
  },
  wealth: {
    極佳: "{p}適合談錢、簽約、收款。",
    良好: "{p}可以處理財務上的事。",
    平穩: "{p}收支照常，不必特別動作。",
    稍弱: "{p}避免大筆花費。",
    需留意: "{p}不宜投資、借貸或簽約。",
  },
  love: {
    極佳: "{p}適合約會、表白。",
    良好: "{p}相處融洽，適合安排約會。",
    平穩: "{p}感情平淡，多一點體貼就好。",
    稍弱: "{p}容易拌嘴，說話溫和些。",
    需留意: "{p}容易起爭執，避開敏感話題。",
  },
  health: {
    極佳: "{p}精神好，適合運動。",
    良好: "{p}身體狀態不錯。",
    平穩: "{p}作息照常就好。",
    稍弱: "{p}容易疲累，早點休息。",
    需留意: "{p}要留意身體，避免勞累與危險活動。",
  },
  social: {
    極佳: "{p}適合拜訪、聚會或請人幫忙。",
    良好: "{p}人際順，可以多聯絡朋友。",
    平穩: "{p}人際平平，照常往來。",
    稍弱: "{p}容易有誤會，少說多聽。",
    需留意: "{p}避免借貸、作保與爭論。",
  },
  home: {
    極佳: "{p}適合搬家、入宅、安床、簽房屋合約。",
    良好: "{p}可以處理家中與房屋的事。",
    平穩: "{p}家中照常，不必特別動作。",
    稍弱: "{p}家中的事容易卡住，搬遷、動工可以緩一緩。",
    需留意: "{p}不宜搬家、動土或簽房屋合約。",
  },
  travel: {
    極佳: "{p}適合出發、出差、遠行或交車。",
    良好: "{p}出門順利，可以安排外出。",
    平穩: "{p}外出照常。",
    稍弱: "{p}出門容易有小狀況，行程留點彈性。",
    需留意: "{p}不宜出遠門，行程容易生變，注意安全。",
  },
  children: {
    極佳: "{p}適合產檢、求子或安排親子活動。",
    良好: "{p}親子互動順，適合陪伴子女。",
    平穩: "{p}子女方面照常。",
    稍弱: "{p}子女的事容易讓人操心，多點耐心。",
    需留意: "{p}不宜處理子女的重大事項，容易起波折。",
  },
  elders: {
    極佳: "{p}適合考試、送件、申請、拜訪長輩或向上提案。",
    良好: "{p}文書辦事順，可以處理證件與申請。",
    平穩: "{p}文書往來照常。",
    稍弱: "{p}文件容易出錯，送出前多看一遍。",
    需留意: "{p}不宜考試、送件或與長輩談重要的事。",
  },
  spirit: {
    極佳: "{p}適合祈福、拜拜、靜心或做重要決定。",
    良好: "{p}心情穩，適合安排休息或進香。",
    平穩: "{p}心境照常。",
    稍弱: "{p}心情容易煩，重要決定緩一緩。",
    需留意: "{p}心情容易低落，不宜做重大決定或祈福大事。",
  },
};

/* ───────────── 計分權重 ───────────── */

const MUTAGEN_WEIGHT: Record<Mutagen, number> = { 祿: 3, 權: 2, 科: 1.5, 忌: -3 };
const BRIGHTNESS_WEIGHT: Record<string, number> = { 廟: 2, 旺: 1.5, 得: 1, 利: 0.5, 平: 0, 不: -0.5, 陷: -1 };
const OPPOSITE_FACTOR = 0.6;
const TRINE_FACTOR = 0.4;

/* ───────────── 運限層級 ───────────── */

const LAYER: Record<
  Level,
  { name: string; word: string; currentWord?: string; parent: Level | null; natalFactor: number; summary: typeof PERIOD_SUMMARY }
> = {
  decadal: { name: "大限", word: "這十年", parent: null, natalFactor: 0.5, summary: PERIOD_SUMMARY },
  yearly: { name: "流年", word: "這一年", currentWord: "今年", parent: "decadal", natalFactor: 0.4, summary: PERIOD_SUMMARY },
  monthly: { name: "流月", word: "這個月", parent: "yearly", natalFactor: 0.3, summary: PERIOD_SUMMARY },
  daily: { name: "流日", word: "這天", currentWord: "今天", parent: "monthly", natalFactor: 0.25, summary: DAY_SUMMARY },
  hourly: { name: "流時", word: "這個時辰", parent: "daily", natalFactor: 0.2, summary: DAY_SUMMARY },
};

/** 起運前的童限（一命、二財、三疾厄…每年換一宮），iztro 的 decadal 名稱為「童限」 */
function layerMeta(level: Level, horoscope: IFunctionalHoroscope) {
  const meta = LAYER[level];
  return level === "decadal" && horoscope.decadal.name === "童限" ? { ...meta, name: "童限", word: "童限這一年" } : meta;
}

/* ───────────── 分析 ───────────── */

export function analyzeNatal(astrolabe: Astrolabe): AspectResult[] {
  return ASPECTS.map((aspect) => {
    const palace = astrolabe.palaces.find((p) => p.name === aspect.palace)!;
    const { raw, insights } = evaluateNatal(astrolabe, palace.index, aspect);
    return buildResult(aspect, palace, raw, insights, NATAL_SUMMARY, "");
  });
}

/**
 * 分析某一層運限。current 為 true 時用「今年」「今天」等字眼。
 * aspects 預設為五運；擇日會傳入 ALL_ASPECTS，連田宅、遷移、子女、父母、福德一起看。
 */
export function analyzeLayer(
  astrolabe: Astrolabe,
  horoscope: IFunctionalHoroscope,
  level: Level,
  current = false,
  aspects: readonly Aspect[] = ASPECTS,
): AspectResult[] {
  const meta = layerMeta(level, horoscope);
  const word = (current && meta.currentWord) || meta.word;
  const item = horoscope[level];
  const mutagens = locateMutagens(astrolabe, item.mutagen);
  const parent = meta.parent
    ? { meta: layerMeta(meta.parent, horoscope), mutagens: locateMutagens(astrolabe, horoscope[meta.parent].mutagen) }
    : null;

  return aspects.map((aspect) => {
    const { key, noun } = aspect;
    const index = item.palaceNames.findIndex((n) => n === aspect.palace);
    const palace = astrolabe.palaces[index];
    const rel = surroundedIndexes(index);
    const trines = [rel.trineA, rel.trineB];
    const insights: Insight[] = [];
    let raw = evaluateNatal(astrolabe, index, aspect).raw * meta.natalFactor;

    insights.push({ tone: "neutral", text: layerOpening(astrolabe, palace, aspect, meta.name, word) });

    // 本宮的生年祿忌被引動
    for (const star of starsOf(palace)) {
      if (star.mutagen === "忌")
        insights.push({ tone: "bad", text: `這一宮本身有生年${star.name}化忌，${word}走到這裡，${NATAL_JI_TRIGGERED[key]}。` });
      if (star.mutagen === "祿")
        insights.push({ tone: "good", text: `這一宮本身有生年${star.name}化祿，${word}走到這裡，${NATAL_LU_TRIGGERED[key]}。` });
    }

    // 上一層的祿忌：大環境
    const pJi = parent?.mutagens.find((m) => m.mutagen === "忌");
    const pLu = parent?.mutagens.find((m) => m.mutagen === "祿");
    if (parent && pLu?.index === index) {
      raw += MUTAGEN_WEIGHT.祿 * 0.6;
      insights.push({
        tone: "good",
        text: `${parent.meta.name}${pLu.star}化祿落在這一宮，${parent.meta.word}${noun}的底子不錯，${word}能順勢發揮。`,
      });
    }
    if (parent && pJi?.index === index) {
      raw += MUTAGEN_WEIGHT.忌 * 0.6;
      insights.push({
        tone: "bad",
        text: `${parent.meta.name}${pJi.star}化忌也在這一宮，${parent.meta.word}${noun}上原本就比較吃力，${word}更要穩。`,
      });
    } else if (parent && pJi?.index === rel.opposite) {
      raw += MUTAGEN_WEIGHT.忌 * 0.3;
      insights.push({
        tone: "bad",
        text: `${parent.meta.name}${pJi.star}化忌從對宮沖入，${parent.meta.word}${noun}上的壓力一直都在，${word}別硬碰硬。`,
      });
    }

    // 本層四化
    const aroundGood: string[] = [];
    for (const m of mutagens) {
      if (m.index === index) {
        raw += MUTAGEN_WEIGHT[m.mutagen];
        insights.push({
          tone: m.mutagen === "忌" ? "bad" : "good",
          text: `${meta.name}${m.star}化${m.mutagen}進入，${word}${MUTAGEN_TEXT[m.mutagen][key]}`,
        });
      } else if (m.index === rel.opposite || trines.includes(m.index)) {
        raw += MUTAGEN_WEIGHT[m.mutagen] * (m.index === rel.opposite ? OPPOSITE_FACTOR : TRINE_FACTOR);
        if (m.mutagen !== "忌") aroundGood.push(`${m.star}化${m.mutagen}`);
        else if (m.index === rel.opposite)
          insights.push({ tone: "bad", text: `${meta.name}${m.star}化忌從對宮沖入，${word}${CHONG_TEXT[key]}` });
        else insights.push({ tone: "bad", text: `${meta.name}${m.star}化忌在三合宮，${word}${noun}上多少受到牽動。` });
      }
    }
    if (aroundGood.length)
      insights.push({ tone: "good", text: `${meta.name}${aroundGood.join("、")}在三方照會，${word}${noun}上有助力。` });
    if (parent && pJi?.index === index && mutagens.some((m) => m.mutagen === "忌" && m.index === index)) {
      raw -= 1;
      insights.push({ tone: "bad", text: `${parent.meta.name}和${meta.name}的化忌都落在這一宮，是${word}最需要提防的地方。` });
    }

    // 流曜（流祿、月昌、日羊……依名稱最後一字判斷）
    const flowing = (item.stars?.[index] ?? []).map((s) => s.name as string);
    const lucky = flowing.filter((n) => "祿昌曲魁鉞".includes(n.slice(-1)));
    if (lucky.length) {
      raw += lucky.length * 0.8;
      insights.push({ tone: "good", text: `${lucky.join("、")}到這一宮，${word}${noun}上多一點助力。` });
    }
    const yang = flowing.find((n) => n.endsWith("羊"));
    if (yang) {
      raw -= 1;
      insights.push({ tone: "bad", text: `${yang}到這一宮，${word}${noun}上容易有競爭或衝突。` });
    }
    const tuo = flowing.find((n) => n.endsWith("陀"));
    if (tuo) {
      raw -= 1;
      insights.push({ tone: "bad", text: `${tuo}到這一宮，${word}${noun}上的事情容易拖延、卡住。` });
    }
    if (key === "love") {
      const romance = [flowing.some((n) => n.endsWith("鸞")) && "紅鸞", flowing.some((n) => n.endsWith("喜")) && "天喜"].filter(Boolean);
      if (romance.length) {
        raw += 1;
        insights.push({ tone: "good", text: `${word}${romance.join("、")}星動，感情上容易有新的緣分或進展。` });
      }
    }

    if (insights.length === 1)
      insights.push({ tone: "neutral", text: `${word}沒有特別的四化或流曜牽動，${noun}大致照本命的步調走。` });

    return buildResult(aspect, palace, raw, insights, meta.summary, word);
  });
}

function evaluateNatal(astrolabe: Astrolabe, index: number, aspect: Aspect) {
  const { key, noun } = aspect;
  const palace = astrolabe.palaces[index];
  const rel = surroundedIndexes(index);
  const opposite = astrolabe.palaces[rel.opposite];
  const trines = [rel.trineA, rel.trineB].map((i) => astrolabe.palaces[i]);
  const pal = aspect.palace;
  const insights: Insight[] = [];
  let raw = 0;

  // 主星：空宮借對宮主星，力量打折
  const borrowed = palace.majorStars.length === 0;
  const majors = borrowed ? opposite.majorStars : palace.majorStars;
  if (borrowed) {
    insights.push({
      tone: "neutral",
      text: `${palaceTitle(pal)}沒有主星，借對宮${palaceTitle(opposite.name)}的${names(majors)}來看，${noun}比較容易隨環境起落。`,
    });
  }
  majors.forEach((star, i) => {
    const trait = MAJOR_TRAITS[star.name]?.[key];
    if (!trait) return;
    const lead = borrowed ? `借入的${star.name}，` : i === 0 ? `${palaceTitle(pal)}見${star.name}，` : `同宮還有${star.name}，`;
    insights.push({ tone: "neutral", text: lead + trait });
  });
  if (majors.length) {
    const avg = majors.reduce((sum, s) => sum + (BRIGHTNESS_WEIGHT[s.brightness ?? ""] ?? 0), 0) / majors.length;
    raw += avg * (borrowed ? 0.6 : 1);
    if (!borrowed) {
      const strong = majors.filter((s) => s.brightness === "廟" || s.brightness === "旺");
      const weak = majors.filter((s) => s.brightness === "陷" || s.brightness === "不");
      if (strong.length && avg >= 1.5)
        insights.push({ tone: "good", text: `${names(strong)}在這裡廟旺，${BRIGHT_GOOD[key]}。` });
      else if (weak.length && avg < 0)
        insights.push({
          tone: "bad",
          text: `${names(weak)}在這裡${weak.every((s) => s.brightness === "陷") ? "落陷" : "不得地"}，${BRIGHT_BAD[key]}。`,
        });
    }
  }

  // 生年四化：坐宮
  for (const star of starsOf(palace)) {
    const m = star.mutagen as Mutagen;
    if (!(m in MUTAGEN_WEIGHT)) continue;
    raw += MUTAGEN_WEIGHT[m];
    insights.push({ tone: m === "忌" ? "bad" : "good", text: `${star.name}化${m}在${palaceTitle(pal)}，${MUTAGEN_TEXT[m][key]}` });
  }

  // 生年四化：三方四正（對宮化忌為沖）
  const aroundGood: string[] = [];
  for (const [p, factor] of [[opposite, OPPOSITE_FACTOR], ...trines.map((t) => [t, TRINE_FACTOR] as const)] as const) {
    for (const star of starsOf(p)) {
      const m = star.mutagen as Mutagen;
      if (!(m in MUTAGEN_WEIGHT)) continue;
      raw += MUTAGEN_WEIGHT[m] * factor;
      if (m !== "忌") aroundGood.push(`${star.name}化${m}`);
      else if (p === opposite) insights.push({ tone: "bad", text: `對宮${star.name}化忌沖入，${CHONG_TEXT[key]}` });
      else insights.push({ tone: "bad", text: `三合宮有${star.name}化忌，${noun}上多少有些牽絆。` });
    }
  }

  // 六吉
  const minors = palace.minorStars;
  const soft = minors.filter((s) => s.type === "soft");
  if (soft.length) {
    raw += soft.length;
    insights.push(...luckyInsights(key, soft));
  }

  // 祿存、天馬、祿馬交馳
  const hasLucun = minors.some((s) => s.type === "lucun");
  const hasTianma = minors.some((s) => s.type === "tianma");
  if (hasLucun) {
    raw += 1;
    insights.push({ tone: "good", text: LUCUN_TEXT[key] });
  }
  if (hasTianma) {
    raw += 0.3;
    insights.push({ tone: "neutral", text: TIANMA_TEXT[key] });
  }
  if (hasTianma && (hasLucun || starsOf(palace).some((s) => s.mutagen === "祿")) && (key === "career" || key === "wealth")) {
    raw += 1;
    insights.push({ tone: "good", text: "祿與天馬同宮，稱為祿馬交馳，在外奔走反而能帶來財富。" });
  }

  // 六煞
  const tough = minors.filter((s) => s.type === "tough");
  if (tough.length) {
    raw -= tough.length * 1.2;
    insights.push(...toughInsights(key, tough));
  }

  // 三方四正的吉煞
  const around = [opposite, ...trines];
  const aroundSoft = around.flatMap((p) => p.minorStars.filter((s) => s.type === "soft" || s.type === "lucun"));
  const aroundTough = around.flatMap((p) => p.minorStars.filter((s) => s.type === "tough"));
  raw += aroundSoft.length * 0.4 - aroundTough.length * 0.4;
  const manySoft = aroundSoft.length - aroundTough.length >= 2;
  if (aroundGood.length)
    insights.push({
      tone: "good",
      text: `三方四正會到${aroundGood.join("、")}${manySoft ? `，還有${names(aroundSoft)}` : ""}，${AROUND_GOOD[key]}。`,
    });
  else if (manySoft) insights.push({ tone: "good", text: `三方四正會到${names(aroundSoft)}，助力不少。` });
  if (aroundTough.length - aroundSoft.length >= 2)
    insights.push({ tone: "bad", text: `三方四正見${names(aroundTough)}，外在壓力不小，凡事多留後路。` });

  if (key === "love") {
    const romance = palace.adjectiveStars.filter((s) => s.name === "紅鸞" || s.name === "天喜");
    if (romance.length) {
      raw += 0.5;
      insights.push({ tone: "good", text: `${names(romance)}在夫妻宮，感情緣分來得自然。` });
    }
  }

  return { raw, insights };
}

function luckyInsights(key: AspectKey, stars: IFunctionalStar[]): Insight[] {
  const list = names(stars);
  if (key === "love") {
    const pick = (pair: string[]) => stars.filter((s) => pair.includes(s.name));
    const out: Insight[] = [];
    const fubi = pick(PAIRS.輔弼);
    const changqu = pick(PAIRS.昌曲);
    const kuiyue = pick(PAIRS.魁鉞);
    if (fubi.length)
      out.push({ tone: "neutral", text: `${names(fubi)}入夫妻，另一半是得力的幫手，但也要防感情中出現第三者。` });
    if (changqu.length)
      out.push({ tone: "good", text: `${names(changqu)}入夫妻，另一半斯文有才氣，不過昌曲也帶桃花，界線要守好。` });
    if (kuiyue.length) out.push({ tone: "good", text: `${names(kuiyue)}入夫妻，容易透過長輩或朋友介紹認識對象。` });
    return out;
  }
  const text: Record<Exclude<AspectKey, "love">, string> = {
    career: `${list}同在官祿，工作上常有人幫襯${stars.some((s) => PAIRS.昌曲.includes(s.name)) ? "，考試、證照和文書方面也有利" : ""}。`,
    wealth: `${list}同在財帛，賺錢的路上常有人牽線、幫忙。`,
    health: `${list}同在疾厄，生病時容易遇到好醫生，恢復也快。`,
    social: `${list}同在交友宮，朋友裡有能幫上忙的人，人脈是你的助力。`,
    home: `${list}同在田宅，置產、搬遷常有人幫忙，家中也多貴人。`,
    travel: `${list}同在遷移，出門在外常遇貴人，辦事順利。`,
    children: `${list}同在子女，子女聰明有才，親子之間多助力。`,
    elders: `${list}同在父母，長輩與長官提攜多${stars.some((s) => PAIRS.昌曲.includes(s.name)) ? "，考試與文書特別有利" : ""}。`,
    spirit: `${list}同在福德，心境開闊、有福氣，常有人幫你解憂。`,
  };
  return [{ tone: "good", text: text[key] }];
}

function toughInsights(key: AspectKey, stars: IFunctionalStar[]): Insight[] {
  const list = names(stars);
  switch (key) {
    case "career":
      return [{ tone: "bad", text: `${list}同在官祿，工作上競爭、阻力比較多，穩紮穩打比搶快好。` }];
    case "wealth": {
      const kongjie = stars.filter((s) => s.name === "地空" || s.name === "地劫");
      const others = stars.filter((s) => !kongjie.includes(s));
      const out: Insight[] = [];
      if (kongjie.length)
        out.push({ tone: "bad", text: `${names(kongjie)}入財帛，錢容易莫名流出去，投機、借貸都要避開。` });
      if (others.length)
        out.push({ tone: "bad", text: `${names(others)}同在財帛，賺錢較辛苦，開銷也常來得又急又快。` });
      return out;
    }
    case "love":
      return [{ tone: "bad", text: `${list}入夫妻，感情容易有摩擦或波折，晚一點定下來反而穩。` }];
    case "health": {
      const parts = [...new Set(stars.map((s) => HEALTH_TOUGH[s.name]).filter(Boolean))];
      return [{ tone: "bad", text: `疾厄宮見${list}，要留意${parts.join("、")}。` }];
    }
    case "social":
      return [{ tone: "bad", text: `${list}同在交友宮，朋友間容易起衝突或被拖累，合夥、借錢要特別小心。` }];
    case "home":
      return [{ tone: "bad", text: `${list}同在田宅，家宅容易有變動或損耗，置產、裝修與合約要特別謹慎。` }];
    case "travel":
      return [{ tone: "bad", text: `${list}同在遷移，出門在外容易有阻礙或意外，行程與安全要多留心。` }];
    case "children":
      return [{ tone: "bad", text: `${list}同在子女，為子女操心較多，懷孕生產也要多保養。` }];
    case "elders":
      return [{ tone: "bad", text: `${list}同在父母，與長輩容易有衝突，文書證件容易出錯。` }];
    case "spirit":
      return [{ tone: "bad", text: `${list}同在福德，心裡壓力大、容易煩躁，要主動找紓壓的方式。` }];
  }
}

function layerOpening(astrolabe: Astrolabe, palace: IFunctionalPalace, aspect: Aspect, layerName: string, word: string) {
  const head = `${layerName}${palaceName(aspect.palace)}走到本命${palaceTitle(palace.name)}`;
  const majors = palace.majorStars;
  if (!majors.length) {
    const opp = astrolabe.palaces[surroundedIndexes(palace.index).opposite];
    return `${head}，宮中沒有主星，借對宮的${names(opp.majorStars)}來看，${word}${aspect.noun}比較容易隨環境起落。`;
  }
  if (aspect.key === "health")
    return `${head}，${names(majors)}坐守，${word}要多照顧${majors.map((s) => HEALTH_PARTS[s.name]).filter(Boolean).join("、")}。`;
  return `${head}，${names(majors)}坐守，${word}${aspect.noun}上${YEARLY_TONE[majors[0].name]}。`;
}

/* ───────────── 工具 ───────────── */

function starsOf(palace: IFunctionalPalace) {
  return [...palace.majorStars, ...palace.minorStars];
}

function names(stars: { name: string }[]) {
  return [...new Set(stars.map((s) => s.name))].join("、");
}

function locateMutagens(astrolabe: Astrolabe, starNames: string[]) {
  return (["祿", "權", "科", "忌"] as const).flatMap((mutagen, i) => {
    const palace = astrolabe.palaces.find((p) => starsOf(p).some((s) => s.name === starNames[i]));
    return palace ? [{ mutagen, star: starNames[i], index: palace.index }] : [];
  });
}

function buildResult(
  aspect: Aspect,
  palace: IFunctionalPalace,
  raw: number,
  insights: Insight[],
  summaries: Record<AspectKey, Record<Grade, string>>,
  word: string,
): AspectResult {
  const score = Math.round(Math.min(95, Math.max(12, 50 + raw * 6.5)));
  const level = gradeOf(score);
  return {
    key: aspect.key,
    label: aspect.label,
    palaceIndex: palace.index,
    palaceLabel: `${palaceTitle(palace.name)}・${palace.heavenlyStem}${palace.earthlyBranch}`,
    score,
    level,
    summary: summaries[aspect.key][level].replace("{p}", word),
    insights,
  };
}
