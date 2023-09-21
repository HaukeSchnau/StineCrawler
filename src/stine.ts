import { Browser, ElementHandle, Page } from "puppeteer";
import dayjs from "dayjs";
import { EventDate, Module } from "./module.type.ts";

const username = process.env.USERNAME!;
const password = process.env.PASSWORD!;

const buildUrl = (href: string) => `https://stine.uni-hamburg.de${href}`;

const parseTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  return parseInt(hours) * 60 + parseInt(minutes);
};

const getEventTitle = async (row: ElementHandle): Promise<string | null> => {
  const eventTitle = await row.$(".tbsubhead .eventTitle");
  if (!eventTitle) return null;
  return await eventTitle.evaluate((node) => node.textContent);
};

const getShortEventTitle = async (
  row: ElementHandle,
): Promise<string | null> => {
  const element = await row.$(".tbsubhead a:has(.eventTitle)");
  if (!element) return null;

  return await element.evaluate(
    (node) => node.childNodes[0].textContent?.trim(),
  );
};

const getCredits = async (
  browser: Browser,
  row: ElementHandle,
): Promise<number | null> => {
  const url = await row.$eval(".tbsubhead a:has(.eventTitle)", (node) =>
    node.getAttribute("href"),
  );
  const page = await browser.newPage();
  await page.goto(buildUrl(url!));
  const selector = "::-p-text('Credits')";
  await page.waitForSelector(selector);
  const credits = await page.$eval(
    selector,
    (node) => node.nextSibling.textContent,
  );
  await page.close();
  return parseFloat(credits.trim().replace(",", "."));
};

const getLectureDates = async (page: Page): Promise<EventDate[]> => {
  const dates: EventDate[] = [];

  const termineSelector = "table.tb.list.rw-table.rw-all";
  await page.waitForSelector(termineSelector);
  const termineTable = await page.$(termineSelector);
  const termineRows = await termineTable?.$$("tr:not(.rw-hide)");
  if (!termineRows) return [];
  for (const termineRow of termineRows) {
    const tds = await termineRow.$$("td");
    if (!tds) continue;

    const [, date, start, end] = tds;
    const dateText = await date.evaluate((node) => node.textContent);
    const startText = await start.evaluate((node) => node.textContent);
    const endText = await end.evaluate((node) => node.textContent);

    const parsedDate = dayjs(
      dateText
        .split(", ")
        .at(-1)
        .replace("Okt", "Oct")
        .replace("Dez", "Dec")
        .replace("Mär", "Mar")
        .replace("Mai", "May"),
      "D. MMM YYYY",
    );

    const startMinutes = parseTime(startText);
    const endMinutes = parseTime(endText);
    const duration = endMinutes - startMinutes;

    dates.push({
      date: parsedDate,
      duration,
      start: startMinutes,
    });
  }

  return dates;
};

export const crawlStine = async (browser: Browser) => {
  const modules: Module[] = [];

  const page = await browser.pages().then((pages) => pages[0]);
  console.log("Going to stine");
  await page.goto("https://stine.uni-hamburg.de");
  await page.waitForSelector("#logIn_btn");
  await page.click("#logIn_btn");

  console.log("Logging in");
  await page.waitForSelector("#Username");
  await page.type("#Username", username);
  await page.type("#Password", password);
  await page.click('button[value="login"');

  console.log("Going to Studium");
  const studiumSelector = "li[title='Studium']";
  await page.waitForSelector(studiumSelector);
  await page.click(studiumSelector);

  console.log("Going to Anmeldungen");
  const anmeldungenSelector = "li[title='Anmeldung zu Veranstaltungen']";
  await page.waitForSelector(anmeldungenSelector);
  await page.click(anmeldungenSelector);

  console.log("Going to Wahlpflichtbereich");
  const wahlpflichtbereichSelector = "::-p-text('Wahlpflichtbereich')";
  await page.waitForSelector(wahlpflichtbereichSelector);
  await page.click(wahlpflichtbereichSelector);

  const tableSelector = "table.tbcoursestatus";
  await page.waitForSelector(tableSelector);
  const table = await page.$(tableSelector);
  const rows = await table?.$$("tr");
  if (!rows) return;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) {
      console.log("No row");
      continue;
    }

    const eventTitle = await getEventTitle(row);
    if (!eventTitle) {
      console.log("No event title");
      continue;
    }

    const shortEventTitle = await getShortEventTitle(row);
    if (!shortEventTitle) {
      console.log("No short event title");
      continue;
    }

    console.log("Found module", shortEventTitle);

    const credits = await getCredits(browser, row);
    if (!credits) {
      console.log("No credits");
      continue;
    }

    const module: Module = {
      name: eventTitle,
      shortName: shortEventTitle,
      credits,
      events: [],
    };

    while (rows[i + 1] && !(await getEventTitle(rows[i + 1]))) {
      const nextRow = rows[++i];
      const nameEl = await nextRow.$(".tbdata.dl-inner .eventTitle");
      if (!nameEl) continue;
      const name: string = await nameEl.evaluate((node) => node.textContent);

      const href = await nextRow.$eval(
        ".tbdata.dl-inner a:has(.eventTitle)",
        (node) => node.getAttribute("href"),
      );

      const type = name.includes("Übung") ? "exercise" : "lecture";

      const page = await browser.newPage();
      await page.goto(buildUrl(href!));

      const detailSelector = "::-p-text('Veranstaltungsdetails')";
      await page.waitForSelector(detailSelector);

      const groupBtnSelector = "a::-p-text('Kleingruppe anzeigen')";
      const groupBtns = await page.$$(groupBtnSelector);

      if (groupBtns.length > 0) {
        for (const link of groupBtns) {
          console.log("Going to Kleingruppe");
          const href = await link.evaluate((node) => node.getAttribute("href"));
          const groupPage = await browser.newPage();
          await groupPage.goto(buildUrl(href!));
          const dates = await getLectureDates(groupPage);
          await groupPage.close();

          module.events.push({
            type,
            dates,
          });
        }
      } else {
        const dates = await getLectureDates(page);

        module.events.push({
          type,
          dates,
        });
      }

      await page.close();
    }

    modules.push(module);
  }

  return modules;
};
