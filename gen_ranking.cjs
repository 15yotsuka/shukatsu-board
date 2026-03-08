const fs = require('fs');

// Read ranking text
const rankingText = fs.readFileSync('ranking.txt', 'utf8');

// Read existing suggestions to get current COMPANY_NAMES
const existingTs = fs.readFileSync('src/lib/companySuggestions.ts', 'utf8');
const existingNames = new Set();
const nameMatches = existingTs.match(/"([^"]+)",?\s*$/mg) || [];
// More robust: parse COMPANY_NAMES array lines
const companyNamesSection = existingTs.match(/export const COMPANY_NAMES[^=]*=\s*\[([\s\S]*?)\];/);
if (companyNamesSection) {
  const namesBlock = companyNamesSection[1];
  const lines = namesBlock.split('\n');
  lines.forEach(line => {
    const m = line.match(/"([^"]+)"/);
    if (m) existingNames.add(m[1]);
  });
}
console.log('Existing names count:', existingNames.size);

// Parse ranking text - extract company names
const rawNames = new Set();

const lines = rankingText.split('\n');
for (const line of lines) {
  // Remove level prefix like 【80】
  const stripped = line.replace(/【\d+】/, '').trim();
  if (!stripped) continue;

  // Split by spaces
  const tokens = stripped.split(/\s+/);

  for (const token of tokens) {
    if (!token) continue;
    // Remove parenthetical suffixes like (GCF), (IB), (戦略), (記者), etc.
    // But keep the base company name
    let name = token.replace(/[（(][^）)]*[）)]/g, '').trim();
    // Remove trailing & that was part of truncated name
    name = name.replace(/&$/, '').trim();
    // Skip empty or too short
    if (!name || name.length < 2) continue;
    // Skip if it looks like a label/number only
    if (/^\d+$/.test(name)) continue;

    rawNames.add(name);
  }
}

console.log('Raw names from ranking:', rawNames.size);

// Filter out already existing names
const newNames = [...rawNames].filter(n => !existingNames.has(n));
console.log('New names to add:', newNames.length);
console.log('New names:', newNames.slice(0, 20));

// Generate industry mapping for new names using same patterns as existing deriveIndustry
function guessIndustry(name) {
  if (/銀行|証券|信託|フィナンシャル|FG$|HD$/.test(name)) return 'メガバンク・証券';
  if (/保険|生命|損保/.test(name)) return '保険';
  if (/商事|物産|双日|丸紅|伊藤忠/.test(name)) return '商社';
  if (/コンサル|マッキンゼー|アクセンチュア|デロイト|KPMGコンサル|PwCコンサル/.test(name)) return 'コンサル';
  if (/ソフトバンク|ドコモ|KDDI|NTT|通信/.test(name)) return 'IT・通信';
  if (/自動車|モーター|カー|トヨタ|ホンダ|日産|スズキ|マツダ/.test(name)) return '自動車';
  if (/電機|電気|エレクトロニクス|精工|製作所/.test(name)) return 'メーカー';
  if (/製薬|ファーマ|薬品|医薬/.test(name)) return '製薬';
  if (/不動産/.test(name)) return '不動産';
  if (/建設|工務店/.test(name)) return '建設';
  if (/食品|飲料|ビール|製菓|乳業|製パン/.test(name)) return '食品';
  if (/広告|博報堂|電通/.test(name)) return '広告';
  if (/テレビ|新聞|放送|出版|映画|メディア/.test(name)) return 'メディア';
  if (/急便|運輸|物流|倉庫|航空|鉄道|高速道路/.test(name)) return '物流・運輸';
  if (/電力|ガス|エネルギー|石油/.test(name)) return 'エネルギー';
  if (/化学|ケミカル|素材|繊維/.test(name)) return '化学';
  if (/ゲーム|エンタメ|コナミ|バンダイ|任天堂/.test(name)) return 'ゲーム';
  if (/人材|リクルート|パーソル/.test(name)) return '人材';
  if (/重工|機械/.test(name)) return '重工業';
  return '';
}

// Write the new companies to append
const newEntriesForData = newNames.map(n => {
  const industry = guessIndustry(n);
  return `  "${n}": { industry: "${industry}", color: "#6B7280" },`;
});

const newEntriesForNames = newNames.map(n => `  "${n}",`);

// Output summary
console.log('\nSample of new entries:');
newEntriesForData.slice(0, 5).forEach(e => console.log(e));

// Write to files for manual review
fs.writeFileSync('new_company_data.txt', newEntriesForData.join('\n'), 'utf8');
fs.writeFileSync('new_company_names.txt', newEntriesForNames.join('\n'), 'utf8');
console.log('\nWritten to new_company_data.txt and new_company_names.txt');
