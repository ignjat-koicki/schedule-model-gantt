# modelschedules-gantt

A Vue 3 schedule roadmap and Gantt-style timeline component.

## Installation

```bash
npm install @modelschedules/gantt vue
```

## Usage

```vue
<script setup lang="ts">
import { ScheduleModel } from '@modelschedules/gantt';
import '@modelschedules/gantt/style.css';
import type { ScheduleModelData } from '@modelschedules/gantt';

const schedules: ScheduleModelData[] = [
  {
    Id: 1,
    CategoryName: 'Planning',
    ParentId: 0,
    Name: 'Requirements and discovery',
    Description: '',
    StartDate: new Date('2026-08-01'),
    EndDate: new Date('2026-08-08'),
    Complete: 100,
  },
];

function handleTaskClick(schedule: ScheduleModelData) {
  console.log(schedule);
}
</script>

<template>
  <ScheduleModel :schedules="schedules" @task-click="handleTaskClick" />
</template>
```

When no schedules are provided, the component displays its built-in sample timeline. Styles are imported automatically with the component.

## Schedule fields

Each schedule contains:

| Field | Type | Description |
| --- | --- | --- |
| `id` | `number` | Unique task identifier. |
| `categoryName` | `string` | Top-level category name. |
| `parentId` | `number` | Optional parent task identifier. |
| `name` | `string` | Task name. |
| `description` | `string` | Task description. |
| `startDate` | `Date` | Task start date. |
| `endDate` | `Date` | Task end date. |
| `complete` | `number` | Completion percentage from 0 to 100. |

## Development

```bash
npm run type-check
npm run build
npm run build:ci
```

The production build emits ESM, UMD, CSS, and TypeScript declaration files in `dist/`.