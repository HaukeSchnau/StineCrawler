import dayjs from "dayjs";
import puppeteer from "puppeteer";
import { crawlStine } from "./stine.ts";
import { Module } from "./module.type.ts";

const path = "./data/modules.json";

export const loadModulesFromDisk = async (): Promise<Module[] | null> => {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return null;
  }

  const json = await file.json();
  return json.map((module: any) => ({
    ...module,
    events: module.events.map((event: any) => ({
      ...event,
      dates: event.dates.map((date: any) => ({
        ...date,
        date: dayjs(date.date),
      })),
    })),
  }));
};

const headless = true;

export const getModulesFromStine = async () => {
  const browser = await puppeteer.launch({
    headless: headless ? "new" : false,
  });
  try {
    const modules = await crawlStine(browser);
    if (!modules) {
      console.log("No modules found");
      process.exit(1);
    }
    await Bun.write(path, JSON.stringify(modules, null, 2));
    return modules;
  } finally {
    await browser.close();
  }
};
