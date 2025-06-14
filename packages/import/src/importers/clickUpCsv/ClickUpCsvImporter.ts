import csv from "csvtojson";
import { Importer, ImportResult, IssuePriority } from "../../types";
import { safeParseInt } from "../../utils/parseInt";

interface ClickUpIssueType {
  "Task ID": string;
  "Task Name": string;
  "Task Content": string;
  Status: string;
  "Date Created": string;
  "Date Created Text": string;
  "Due Date": string;
  "Due Date Text": string;
  "Start Date": string;
  "Start Date Text": string;
  "Parent ID": string;
  Attachments: string;
  Assignees: string;
  Tags: string;
  Priority: string;
  "List Name": string;
  "Folder Name": string;
  "Space Name": string;
  "Time Estimated": string;
  "Time Estimated Text": string;
  Checklists: string;
  Comments: string;
  "Assigned Comments": string;
  "Time Spent": string;
  "Time Spent Text": string;
}

/**
 * Import issues from ClickUp CSV export.
 *
 * @param filePath path to csv file
 */
export class ClickUpCsvImporter implements Importer {
  public constructor(filePath: string) {
    this.filePath = filePath;
  }

  public get name(): string {
    return "ClickUp (CSV)";
  }

  public get defaultTeamName(): string {
    return "ClickUp";
  }

  public import = async (): Promise<ImportResult> => {
    const data = (await csv().fromFile(this.filePath)) as ClickUpIssueType[];

    const importData: ImportResult = {
      issues: [],
      labels: {},
      users: {},
      statuses: {},
    };

    // Extract assignees and create user entries
    const assigneesSet = new Set<string>();
    data.forEach(row => {
      try {
        // Assignees in ClickUp CSV are in format "[name1, name2]"
        const assigneesArray = JSON.parse(row.Assignees);
        assigneesArray.forEach((assignee: string) => assigneesSet.add(assignee));
      } catch (e) {
        // Handle parsing errors silently
      }
    });

    // Add users to import data
    Array.from(assigneesSet).forEach(user => {
      importData.users[user] = {
        name: user,
      };
    });

    for (const row of data) {
      // Skip entries without a task name
      if (!row["Task Name"]) {
        continue;
      }

      // Parse tags
      let tags: string[] = [];
      try {
        tags = JSON.parse(row.Tags);
      } catch (e) {
        // Handle parsing errors silently
      }

      // Get primary assignee (first in the list)
      let assigneeId = "";
      try {
        const assignees = JSON.parse(row.Assignees);
        assigneeId = assignees[0] || "";
      } catch (e) {
        // Handle parsing errors silently
      }

      importData.issues.push({
        title: row["Task Name"],
        description: row["Task Content"] === "null" ? "" : row["Task Content"],
        priority: mapPriority(row.Priority),
        status: row.Status,
        assigneeId,
        createdAt: row["Date Created"] ? new Date(parseInt(row["Date Created"])) : undefined,
        startedAt: row["Start Date"] ? new Date(parseInt(row["Start Date"])) : undefined,
        // Convert time-based estimate to a value between 0-64 (Linear's range)
        estimate: (() => {
          if (typeof row["Time Estimated"] === "string" && row["Time Estimated"] !== "") {
            const estimate = safeParseInt(row["Time Estimated"]);
            return typeof estimate === "number" ? Math.min(Math.ceil(estimate / 112500), 64) : undefined;
          }
          return undefined;
        })(),
        labels: tags,
      });

      // Add labels to import data
      for (const tag of tags) {
        if (tag && !importData.labels[tag]) {
          importData.labels[tag] = {
            name: tag,
          };
        }
      }
    }

    return importData;
  };

  private filePath: string;
}

const mapPriority = (priority: string): IssuePriority => {
  // ClickUp priorities: 1 (Urgent), 2 (High), 3 (Normal), 4 (Low), null (No priority)
  const priorityMap: { [k: string]: IssuePriority } = {
    "1": 1, // Urgent
    "2": 2, // High
    "3": 3, // Normal
    "4": 4, // Low
  };

  return priority && priorityMap[priority] !== undefined ? priorityMap[priority] : 0;
};
