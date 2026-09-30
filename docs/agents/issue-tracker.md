# Issue tracker: Paca

Issues and tasks for this repo are tracked in Paca — a project-management tool reached via the Paca MCP server — under the **WaneetaBeach** project. This repo has a GitHub remote, but GitHub Issues is not used for tracking.

## Conventions

- **Resolve the project ID once**: every Paca operation is scoped by `projectId` (a UUID), not the project name. There is no `list_projects` tool exposed to this integration — if the ID isn't already known in-session, ask the user for it.
- **Task hierarchy**: `Epic` sits at the top; `Story`, `Task`, and `Bug` types can nest under an `Epic`, `Story`, `Task`, or `Bug` via `parentTaskId`. Epics cannot have a parent.
- **Create a task**: `create_task` (title required; set `typeId` from `list_task_types`, `statusId` from `list_task_statuses`).
- **Read a task**: `get_task` by UUID, or `get_task_by_number` by its project-local number — the latter also returns subtasks, attachments, and activity.
- **List tasks**: `list_tasks`, filterable by `statusId`, `taskTypeIds`, `assigneeId`, `sprintId`, `parentTaskId`.
- **Update / comment**: `update_task` for fields, `add_task_comment` for discussion.
- **Labels**: Paca has no separate label object — use the `tags` array on `create_task` / `update_task`.
- **Close**: set `statusId` via `update_task` to the project's terminal status (from `list_task_statuses`).

## When a skill says "publish to the issue tracker"

Call `create_task` in the WaneetaBeach project.

## When a skill says "fetch the relevant ticket"

Call `get_task_by_number` with the task's project-local number, or `get_task` if you already have its UUID.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a top-level task with **child** tasks nested under it.

- **Map**: a task created with `create_task` and no `parentTaskId`, holding the Notes / Decisions-so-far / Fog body in its `description`.
- **Child ticket**: a task created with `parentTaskId` set to the map's task ID. Its `typeId` records the ticket type (map `research` / `prototype` / `grilling` / `task` onto whatever types `list_task_types` returns for the project); tag it `wayfinder` via `tags`.
- **Blocking**: `create_task_link` with `linkType: "blocks"` from the blocker to the child. `list_task_links` reports both directions. A ticket is unblocked once every task that `blocks` it has a terminal status.
- **Frontier query**: `list_tasks` filtered to `parentTaskId` = the map, a non-terminal `statusId`, and no `assigneeId`; drop any still blocked per `list_task_links`; first by creation order wins.
- **Claim**: `update_task` to set `assigneeId` to your member ID (from `list_project_members`) — the session's first write.
- **Resolve**: `add_task_comment` with the answer, `update_task` to a terminal `statusId`, then append a context pointer to the map's Decisions-so-far via `update_task` on the map's `description`.
