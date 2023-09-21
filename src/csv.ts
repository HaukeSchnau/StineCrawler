export type Table = string[][];

export const saveTimetable = async (
  table: Table,
  path: string,
): Promise<void> => {
  const timetableFile = Bun.file(path);
  const writer = timetableFile.writer();

  for (const row of table) {
    writer.write(row.join(";"));
    writer.write("\n");
    await writer.flush();
  }

  await writer.end();
};
