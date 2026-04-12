// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
/** Weather area data from https://weather.tsukumijima.net/primary_area.xml */

export interface WeatherCity {
  id: string;
  name: string;
}

export interface WeatherPrefecture {
  name: string;
  cities: WeatherCity[];
}

/** All prefectures and cities supported by the weather API */
export const WEATHER_AREAS: WeatherPrefecture[] = [
  {
    name: "道北",
    cities: [
      { id: "011000", name: "稚内" },
      { id: "012010", name: "旭川" },
      { id: "012020", name: "留萌" },
    ],
  },
  {
    name: "道東",
    cities: [
      { id: "013010", name: "網走" },
      { id: "013020", name: "北見" },
      { id: "013030", name: "紋別" },
      { id: "014010", name: "根室" },
      { id: "014020", name: "釧路" },
      { id: "014030", name: "帯広" },
    ],
  },
  {
    name: "道南",
    cities: [
      { id: "015010", name: "室蘭" },
      { id: "015020", name: "浦河" },
      { id: "017010", name: "函館" },
      { id: "017020", name: "江差" },
    ],
  },
  {
    name: "道央",
    cities: [
      { id: "016010", name: "札幌" },
      { id: "016020", name: "岩見沢" },
      { id: "016030", name: "倶知安" },
    ],
  },
  {
    name: "青森県",
    cities: [
      { id: "020010", name: "青森" },
      { id: "020020", name: "むつ" },
      { id: "020030", name: "八戸" },
    ],
  },
  {
    name: "岩手県",
    cities: [
      { id: "030010", name: "盛岡" },
      { id: "030020", name: "宮古" },
      { id: "030030", name: "大船渡" },
    ],
  },
  {
    name: "宮城県",
    cities: [
      { id: "040010", name: "仙台" },
      { id: "040020", name: "白石" },
    ],
  },
  {
    name: "秋田県",
    cities: [
      { id: "050010", name: "秋田" },
      { id: "050020", name: "横手" },
    ],
  },
  {
    name: "山形県",
    cities: [
      { id: "060010", name: "山形" },
      { id: "060020", name: "米沢" },
      { id: "060030", name: "酒田" },
      { id: "060040", name: "新庄" },
    ],
  },
  {
    name: "福島県",
    cities: [
      { id: "070010", name: "福島" },
      { id: "070020", name: "小名浜" },
      { id: "070030", name: "若松" },
    ],
  },
  {
    name: "茨城県",
    cities: [
      { id: "080010", name: "水戸" },
      { id: "080020", name: "土浦" },
    ],
  },
  {
    name: "栃木県",
    cities: [
      { id: "090010", name: "宇都宮" },
      { id: "090020", name: "大田原" },
    ],
  },
  {
    name: "群馬県",
    cities: [
      { id: "100010", name: "前橋" },
      { id: "100020", name: "みなかみ" },
    ],
  },
  {
    name: "埼玉県",
    cities: [
      { id: "110010", name: "さいたま" },
      { id: "110020", name: "熊谷" },
      { id: "110030", name: "秩父" },
    ],
  },
  {
    name: "千葉県",
    cities: [
      { id: "120010", name: "千葉" },
      { id: "120020", name: "銚子" },
      { id: "120030", name: "館山" },
    ],
  },
  {
    name: "東京都",
    cities: [
      { id: "130010", name: "東京" },
      { id: "130020", name: "大島" },
      { id: "130030", name: "八丈島" },
      { id: "130040", name: "父島" },
    ],
  },
  {
    name: "神奈川県",
    cities: [
      { id: "140010", name: "横浜" },
      { id: "140020", name: "小田原" },
    ],
  },
  {
    name: "新潟県",
    cities: [
      { id: "150010", name: "新潟" },
      { id: "150020", name: "長岡" },
      { id: "150030", name: "高田" },
      { id: "150040", name: "相川" },
    ],
  },
  {
    name: "富山県",
    cities: [
      { id: "160010", name: "富山" },
      { id: "160020", name: "伏木" },
    ],
  },
  {
    name: "石川県",
    cities: [
      { id: "170010", name: "金沢" },
      { id: "170020", name: "輪島" },
    ],
  },
  {
    name: "福井県",
    cities: [
      { id: "180010", name: "福井" },
      { id: "180020", name: "敦賀" },
    ],
  },
  {
    name: "山梨県",
    cities: [
      { id: "190010", name: "甲府" },
      { id: "190020", name: "河口湖" },
    ],
  },
  {
    name: "長野県",
    cities: [
      { id: "200010", name: "長野" },
      { id: "200020", name: "松本" },
      { id: "200030", name: "飯田" },
    ],
  },
  {
    name: "岐阜県",
    cities: [
      { id: "210010", name: "岐阜" },
      { id: "210020", name: "高山" },
    ],
  },
  {
    name: "静岡県",
    cities: [
      { id: "220010", name: "静岡" },
      { id: "220020", name: "網代" },
      { id: "220030", name: "三島" },
      { id: "220040", name: "浜松" },
    ],
  },
  {
    name: "愛知県",
    cities: [
      { id: "230010", name: "名古屋" },
      { id: "230020", name: "豊橋" },
    ],
  },
  {
    name: "三重県",
    cities: [
      { id: "240010", name: "津" },
      { id: "240020", name: "尾鷲" },
    ],
  },
  {
    name: "滋賀県",
    cities: [
      { id: "250010", name: "大津" },
      { id: "250020", name: "彦根" },
    ],
  },
  {
    name: "京都府",
    cities: [
      { id: "260010", name: "京都" },
      { id: "260020", name: "舞鶴" },
    ],
  },
  {
    name: "大阪府",
    cities: [{ id: "270000", name: "大阪" }],
  },
  {
    name: "兵庫県",
    cities: [
      { id: "280010", name: "神戸" },
      { id: "280020", name: "豊岡" },
    ],
  },
  {
    name: "奈良県",
    cities: [
      { id: "290010", name: "奈良" },
      { id: "290020", name: "風屋" },
    ],
  },
  {
    name: "和歌山県",
    cities: [
      { id: "300010", name: "和歌山" },
      { id: "300020", name: "潮岬" },
    ],
  },
  {
    name: "鳥取県",
    cities: [
      { id: "310010", name: "鳥取" },
      { id: "310020", name: "米子" },
    ],
  },
  {
    name: "島根県",
    cities: [
      { id: "320010", name: "松江" },
      { id: "320020", name: "浜田" },
      { id: "320030", name: "西郷" },
    ],
  },
  {
    name: "岡山県",
    cities: [
      { id: "330010", name: "岡山" },
      { id: "330020", name: "津山" },
    ],
  },
  {
    name: "広島県",
    cities: [
      { id: "340010", name: "広島" },
      { id: "340020", name: "庄原" },
    ],
  },
  {
    name: "山口県",
    cities: [
      { id: "350010", name: "下関" },
      { id: "350020", name: "山口" },
      { id: "350030", name: "柳井" },
      { id: "350040", name: "萩" },
    ],
  },
  {
    name: "徳島県",
    cities: [
      { id: "360010", name: "徳島" },
      { id: "360020", name: "日和佐" },
    ],
  },
  {
    name: "香川県",
    cities: [{ id: "370000", name: "高松" }],
  },
  {
    name: "愛媛県",
    cities: [
      { id: "380010", name: "松山" },
      { id: "380020", name: "新居浜" },
      { id: "380030", name: "宇和島" },
    ],
  },
  {
    name: "高知県",
    cities: [
      { id: "390010", name: "高知" },
      { id: "390020", name: "室戸岬" },
      { id: "390030", name: "清水" },
    ],
  },
  {
    name: "福岡県",
    cities: [
      { id: "400010", name: "福岡" },
      { id: "400020", name: "八幡" },
      { id: "400030", name: "飯塚" },
      { id: "400040", name: "久留米" },
    ],
  },
  {
    name: "佐賀県",
    cities: [
      { id: "410010", name: "佐賀" },
      { id: "410020", name: "伊万里" },
    ],
  },
  {
    name: "長崎県",
    cities: [
      { id: "420010", name: "長崎" },
      { id: "420020", name: "佐世保" },
      { id: "420030", name: "厳原" },
      { id: "420040", name: "福江" },
    ],
  },
  {
    name: "熊本県",
    cities: [
      { id: "430010", name: "熊本" },
      { id: "430020", name: "阿蘇乙姫" },
      { id: "430030", name: "牛深" },
      { id: "430040", name: "人吉" },
    ],
  },
  {
    name: "大分県",
    cities: [
      { id: "440010", name: "大分" },
      { id: "440020", name: "中津" },
      { id: "440030", name: "日田" },
      { id: "440040", name: "佐伯" },
    ],
  },
  {
    name: "宮崎県",
    cities: [
      { id: "450010", name: "宮崎" },
      { id: "450020", name: "延岡" },
      { id: "450030", name: "都城" },
      { id: "450040", name: "高千穂" },
    ],
  },
  {
    name: "鹿児島県",
    cities: [
      { id: "460010", name: "鹿児島" },
      { id: "460020", name: "鹿屋" },
      { id: "460030", name: "種子島" },
      { id: "460040", name: "名瀬" },
    ],
  },
  {
    name: "沖縄県",
    cities: [
      { id: "471010", name: "那覇" },
      { id: "471020", name: "名護" },
      { id: "471030", name: "久米島" },
      { id: "472000", name: "南大東" },
      { id: "473000", name: "宮古島" },
      { id: "474010", name: "石垣島" },
      { id: "474020", name: "与那国島" },
    ],
  },
];

/** Default city ID (東京都東京) */
export const DEFAULT_CITY_ID = "130010";
