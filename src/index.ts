import dayjs from "dayjs";
import "dayjs/locale/de";
import { saveTimetable, Table } from "./csv.ts";
import { buildCalendar } from "./calendar.ts";
import {
  getModulesFromStine,
  loadModulesFromDisk,
} from "./moduleRepository.ts";

dayjs.locale("de");

const modules = (await loadModulesFromDisk()) ?? (await getModulesFromStine());

const startDay = dayjs("2023-10-15");
const numDays = 30 * 6;

const calendar = buildCalendar(modules, startDay, numDays);

const preparedTable: Table = [];
for (const day of calendar) {
  const { date, blocks } = day;
  const dayString = date.format("DD.MM.YYYY");

  preparedTable.push([
    dayString,
    blocks[0][0],
    blocks[1][0],
    blocks[2][0],
    blocks[3][0],
    blocks[4][0],
  ]);

  const longestBlockLength = Math.max(...blocks.map((block) => block.length));
  for (let i = 1; i < longestBlockLength; i++) {
    preparedTable.push([
      "",
      blocks[0][i] ?? "",
      blocks[1][i] ?? "",
      blocks[2][i] ?? "",
      blocks[3][i] ?? "",
      blocks[4][i] ?? "",
    ]);
  }
}

await saveTimetable(preparedTable, "./data/timetable.csv");
