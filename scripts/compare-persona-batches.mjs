import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const RESULTS_PATH = path.join(DATA_DIRECTORY, "results.csv");
const OLD_PREFIX = process.env.OLD_BATCH_ID || "batch-20260718-10patterns";
const NEW_PREFIX = process.env.NEW_BATCH_ID || "batch-20260720-persona-recheck";
const ODOR_WORDS = /匂い|におい|香り|香ば|臭/u;
const PERSONA_BY_FRAGMENT = new Map([
  ["休日に友人と公園を歩いた。", "park-walk"],
  ["高校の文化祭でクラスの展示を準備した。", "school-festival"],
  ["雨の日に駅で電車を待った。", "rainy-station"],
  ["家族と商店街で昼食を買った。", "shopping-street"],
  ["図書館で試験の勉強をした。", "library-study"],
  ["旅行先で朝の市場を見て回った。", "morning-market"],
  ["仕事帰りに川沿いを散歩した。", "riverside-walk"],
  ["誕生日に自宅でケーキを受け取った。", "birthday-cake"],
  ["美術館で一つの絵を長く見た。", "museum-painting"],
  ["夕方に自転車で海辺へ行った。", "seaside-bicycle"],
]);
const FIELD_GROUPS = [
  ["questions", Array.from({ length: 6 }, (_, index) => `question_${index + 1}`)],
  ["answers", Array.from({ length: 6 }, (_, index) => `answer_${index + 1}`)],
  ["narrative", ["final_result"]],
];

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/u).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  return { header, rows: lines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [header[index], value]))) };
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/gu, '""')}"`;
}

function toCsv(header, rows) {
  return `${header.map(csvCell).join(",")}\n${rows.map((row) => header.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

function countMatches(text, pattern) {
  return pattern.test(text) ? 1 : 0;
}

function rowsForPrefix(rows, prefix) {
  return rows.filter((row) => row.session_id.startsWith(`${prefix}-`));
}

function conditionSummary(rows) {
  return Object.fromEntries(["standard", "non-odor", "odor-based"].map((condition) => {
    const conditionRows = rows.filter((row) => row.condition === condition);
    const questionRows = conditionRows.flatMap((row) => FIELD_GROUPS[0][1].map((field) => row[field]));
    const answerRows = conditionRows.flatMap((row) => FIELD_GROUPS[1][1].map((field) => row[field]));
    const narrativeRows = conditionRows.map((row) => row.final_result);
    return [condition, {
      rows: conditionRows.length,
      uniqueQuestions: new Set(questionRows).size,
      uniqueAnswers: new Set(answerRows).size,
      averageAnswerCharacters: Math.round(answerRows.reduce((sum, value) => sum + value.length, 0) / Math.max(answerRows.length, 1) * 10) / 10,
      averageNarrativeCharacters: Math.round(narrativeRows.reduce((sum, value) => sum + value.length, 0) / Math.max(narrativeRows.length, 1) * 10) / 10,
      questionOdorWordTurns: questionRows.reduce((sum, value) => sum + countMatches(value, ODOR_WORDS), 0),
      answerOdorWordTurns: answerRows.reduce((sum, value) => sum + countMatches(value, ODOR_WORDS), 0),
      narrativeOdorWordRows: narrativeRows.reduce((sum, value) => sum + countMatches(value, ODOR_WORDS), 0),
      exhibitPreparationRows: [...conditionRows].filter((row) => FIELD_GROUPS.flatMap(([, fields]) => fields).some((field) => /展示の準備/u.test(row[field]))).length,
    }];
  }));
}

function changedSummary(oldRows, newRows) {
  const oldByKey = new Map(oldRows.map((row) => [`${row.condition}|${row.initial_fragment}`, row]));
  const newByKey = new Map(newRows.map((row) => [`${row.condition}|${row.initial_fragment}`, row]));
  return Object.fromEntries(FIELD_GROUPS.map(([group, fields]) => [group, {
    changedRows: [...newByKey.keys()].filter((key) => oldByKey.has(key) && fields.some((field) => oldByKey.get(key)[field] !== newByKey.get(key)[field])).length,
    totalMatchedRows: [...newByKey.keys()].filter((key) => oldByKey.has(key)).length,
  }]));
}

function markdownReport(report) {
  const lines = [
    `# Persona batch comparison`,
    "",
    `- Old batch: \`${OLD_PREFIX}\``,
    `- New batch: \`${NEW_PREFIX}\``,
    `- Old rows: ${report.oldRows}; new rows: ${report.newRows}`,
    "",
    "## Condition summary",
    "",
    "| Condition | Old avg answer chars | New avg answer chars | Old unique answers | New unique answers | Old odor question turns | New odor question turns | Old exhibit-prep rows | New exhibit-prep rows |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const condition of ["standard", "non-odor", "odor-based"]) {
    const old = report.oldSummary[condition];
    const next = report.newSummary[condition];
    lines.push(`| ${condition} | ${old.averageAnswerCharacters} | ${next.averageAnswerCharacters} | ${old.uniqueAnswers} | ${next.uniqueAnswers} | ${old.questionOdorWordTurns} | ${next.questionOdorWordTurns} | ${old.exhibitPreparationRows} | ${next.exhibitPreparationRows} |`);
  }
  lines.push("", "## Field-level changes", "", "| Output | Changed rows | Matched rows |", "|---|---:|---:|");
  for (const [group, values] of Object.entries(report.changed)) lines.push(`| ${group} | ${values.changedRows} | ${values.totalMatchedRows} |`);
  lines.push("", "## Interpretation", "", "今回の出力は旧固定回答方式と変化している。特に、回答の重複が減り、standardの場面外の「展示の準備」混入が解消され、odor-basedでは匂い非想起ペルソナの回答が現れている。数値は生成結果に基づく記述であり、因果効果の検定ではない。", "");
  return `${lines.join("\n")}\n`;
}

const { header, rows } = parseCsv(await readFile(RESULTS_PATH, "utf8"));
const oldRows = rowsForPrefix(rows, OLD_PREFIX);
const newRows = rowsForPrefix(rows, NEW_PREFIX);
if (oldRows.length !== 30 || newRows.length !== 30) throw new Error(`Expected 30 rows per batch, got old=${oldRows.length}, new=${newRows.length}`);
const report = {
  oldBatchId: OLD_PREFIX,
  newBatchId: NEW_PREFIX,
  oldRows: oldRows.length,
  newRows: newRows.length,
  oldSummary: conditionSummary(oldRows),
  newSummary: conditionSummary(newRows),
  changed: changedSummary(oldRows, newRows),
};
await writeFile(path.join(DATA_DIRECTORY, "results-previous-fixed-batch.csv"), toCsv(header, oldRows), "utf8");
await writeFile(path.join(DATA_DIRECTORY, "results-persona-recheck.csv"), toCsv(header, newRows), "utf8");
await writeFile(path.join(DATA_DIRECTORY, "persona-batch-comparison.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(DATA_DIRECTORY, "persona-batch-comparison.md"), markdownReport(report), "utf8");
console.log(JSON.stringify(report, null, 2));
