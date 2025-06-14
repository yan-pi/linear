import * as inquirer from "inquirer";
import { Importer } from "../../types";
import { ClickUpCsvImporter } from "./ClickUpCsvImporter";

const BASE_PATH = process.cwd();

export const clickUpCsvImport = async (): Promise<Importer> => {
  const answers = await inquirer.prompt<ClickUpImportAnswers>(questions);
  const clickUpImporter = new ClickUpCsvImporter(answers.clickUpFilePath);
  return clickUpImporter;
};

interface ClickUpImportAnswers {
  clickUpFilePath: string;
}

const questions = [
  {
    basePath: BASE_PATH,
    type: "filePath",
    name: "clickUpFilePath",
    message: "Select your exported CSV file of ClickUp tasks",
  },
];
