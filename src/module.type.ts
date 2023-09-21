import dayjs from "dayjs";

export type EventDate = {
  date: dayjs.Dayjs;
  start: number;
  duration: number;
};

export type Event = {
  type: "lecture" | "seminar" | "exercise";
  dates: EventDate[];
};

export type Module = {
  name: string;
  shortName: string;
  events: Event[];
  credits: number;
};
