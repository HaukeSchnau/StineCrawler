import dayjs, { Dayjs } from "dayjs";
import { Module } from "./index.ts";

type Block = string[];
type CalendarDay = {
  date: dayjs.Dayjs;
  blocks: [Block, Block, Block, Block, Block];
};
type Calendar = CalendarDay[];

const excludedModules = ["ATI", "CN", "STO2", "EML", "MAKS"];

export const buildCalendar = (
  modules: Module[],
  startDay: Dayjs,
  numDays: number,
) => {
  const calendar: Calendar = Array.from({ length: numDays }).map((_, i) => {
    const date = startDay.add(i, "day");
    return {
      date,
      blocks: [[], [], [], [], []],
    };
  });
  for (const module of modules) {
    if (
      excludedModules.find((excludedModule) =>
        module.shortName.includes(excludedModule),
      )
    ) {
      console.log("Skipping module", module.shortName);
      continue;
    }

    for (let i = 0; i < module.events.length; i++) {
      const event = module.events[i];
      for (const date of event.dates) {
        const day = calendar.find((day) => day.date.isSame(date.date, "day"));
        if (!day) {
          console.log("No day found for date", date.date.format("DD.MM.YYYY"));
          continue;
        }

        const hour = Math.floor(date.start / 60);
        const blockIndex = Math.floor(hour / 2) - 4;

        const block = day.blocks[blockIndex];
        if (!block) {
          console.log(
            "No block found for date",
            date.date.format("DD.MM.YYYY"),
          );
          continue;
        }

        const str = `${module.shortName} (${
          event.type === "lecture" ? "VL" : "Uebung"
        })`;
        if (block.find((candidate) => candidate.includes(str))) {
          continue;
        }
        block.push(`${i} ${str}`);
      }
    }
  }

  return calendar;
};
