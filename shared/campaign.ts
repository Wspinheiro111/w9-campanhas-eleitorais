export const campaignRoles = ["admin", "coordinator", "partner"] as const;
export const taskStatuses = ["backlog", "todo", "in_progress", "review", "done"] as const;
export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export const eventTypes = ["meeting", "rally", "visit", "debate", "internal", "other"] as const;

export type CampaignRole = (typeof campaignRoles)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type EventType = (typeof eventTypes)[number];
