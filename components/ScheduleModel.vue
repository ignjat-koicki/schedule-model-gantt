<template>
  <section class="roadmap" aria-labelledby="roadmap-title">
    <header class="roadmap__header">
      <div>
        <p class="roadmap__eyebrow">Schedule roadmap</p>
        <p class="roadmap__meta">
          {{ displaySchedules.length }} tasks
          <span aria-hidden="true">&middot;</span> {{ rangeLabel }}
        </p>
      </div>
      <div class="roadmap__controls">
        <div class="roadmap__zoom" role="group" aria-label="Timeline zoom">
          <button
            v-for="option in zoomOptions"
            :key="option.value"
            class="roadmap__zoom-button"
            :class="{ 'roadmap__zoom-button--active': zoom === option.value }"
            type="button"
            @click="setZoom(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <button
          class="roadmap__nav"
          type="button"
          aria-label="Previous time period"
          @click="movePeriod(-1)"
        >
          &larr;
        </button>
        <button class="roadmap__today" type="button" @click="goToToday">
          Today
        </button>
        <button
          class="roadmap__nav"
          type="button"
          aria-label="Next time period"
          @click="movePeriod(1)"
        >
          &rarr;
        </button>
      </div>
    </header>

    <div v-if="!displaySchedules.length" class="roadmap__empty">
      No schedule tasks have been added yet.
    </div>
    <div v-else class="roadmap__scroll">
      <div class="roadmap__chart" :style="chartStyle">
        <div class="roadmap__corner">Task</div>
        <div class="roadmap__timeline-head">
          <div
            v-for="interval in intervals"
            :key="interval.key"
            class="roadmap__interval"
            :class="{ 'roadmap__interval--weekend': interval.isWeekend }"
          >
            {{ interval.label }}
          </div>
        </div>
        <div class="roadmap__labels">
          <div
            v-for="row in roadmapRows"
            :key="row.key"
            class="roadmap__label"
            :class="[
              `roadmap__label--${row.type}`,
              { 'roadmap__label--child': row.type === 'task' && row.child },
            ]"
          >
            <template v-if="row.type === 'category'">
              <button
                class="roadmap__section-button"
                type="button"
                :aria-expanded="!collapsedCategories.has(row.key)"
                @click="toggleCategory(row.key)"
              >
                <span class="roadmap__category-mark">{{
                  collapsedCategories.has(row.key) ? "▸" : "▾"
                }}</span>
                <span>{{ row.name }}</span>
                <span class="roadmap__category-count">{{ row.count }}</span>
              </button>
            </template>
            <template v-else>
              <span class="roadmap__dot"></span>
              <span class="roadmap__task-name">{{
                row.schedule.Name || "Untitled task"
              }}</span>
              <span class="roadmap__percent"
                >{{ row.schedule.Complete || 0 }}%</span
              >
            </template>
          </div>
        </div>
        <div class="roadmap__rows">
          <div class="roadmap__grid" aria-hidden="true">
            <span
              v-for="interval in intervals"
              :key="interval.key"
              :class="{ 'roadmap__grid--weekend': interval.isWeekend }"
            ></span>
          </div>
          <div
            v-for="row in roadmapRows"
            :key="row.key"
            class="roadmap__row"
            :class="[
              `roadmap__row--${row.type}`,
              { 'roadmap__row--child': row.type === 'task' && row.child },
            ]"
          >
            <button
              v-if="row.type === 'task'"
              class="roadmap__bar"
              :style="barStyle(row.schedule)"
              type="button"
              :title="taskTitle(row.schedule)"
              @click="$emit('taskClick', row.schedule)"
            >
              <span
                class="roadmap__bar-progress"
                :style="{ width: `${row.schedule.Complete || 0}%` }"
              ></span>
              <span class="roadmap__bar-name">{{
                row.schedule.Name || "Untitled task"
              }}</span>
            </button>
          </div>
          <div
            v-if="todayPosition !== null"
            class="roadmap__today-line"
            :style="{ left: `${todayPosition}%` }"
          >
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import type { ScheduleModel } from "./models/inputModels";

type Zoom = "weeks" | "months" | "years";
interface TimelineInterval {
  key: string;
  label: string;
  start: Date;
  end: Date;
  isWeekend: boolean;
}
type RoadmapRow =
  | { key: string; type: "category"; name: string; count: number }
  | { key: string; type: "task"; schedule: ScheduleModel; child: boolean };

const today = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const zoomOptions: { label: string; value: Zoom }[] = [
  { label: "Weeks", value: "weeks" },
  { label: "Months", value: "months" },
  { label: "Years", value: "years" },
];

export default defineComponent({
  name: "ScheduleModel",
  props: {
    schedules: { type: Array as PropType<ScheduleModel[]>, default: () => [] },
  },
  emits: ["taskClick"],
  data() {
    const schedules = this.schedules.length ? this.schedules : [];
    const firstStart = schedules.reduce((earliest, schedule) => {
      const scheduleStart = new Date(schedule.StartDate);
      return scheduleStart < earliest ? scheduleStart : earliest;
    }, schedules.length ? new Date(schedules[0].StartDate) : today);
    return {
      collapsedCategories: new Set<string>(),
      zoom: "months" as Zoom,
      cursor: new Date(firstStart.getFullYear(), firstStart.getMonth(), 1),
      zoomOptions,
    };
  },
  computed: {
    displaySchedules(): ScheduleModel[] {
      return this.schedules.length ? this.schedules : [];
    },
    roadmapRows(): RoadmapRow[] {
      const rows: RoadmapRow[] = [],
        categories = new Map<string, ScheduleModel[]>(),
        byId = new Map(
          this.displaySchedules.map((schedule) => [schedule.Id, schedule])
        );
      const categoryOf = (schedule: ScheduleModel): string => {
        if (schedule.CategoryName) return schedule.CategoryName;
        const parent = schedule.ParentId
          ? byId.get(schedule.ParentId)
          : undefined;
        return parent ? categoryOf(parent as any) : "Uncategorized";
      };
      this.displaySchedules.forEach((schedule) => {
        const category = categoryOf(schedule),
          tasks = categories.get(category) || [];
        tasks.push(schedule);
        categories.set(category, tasks);
      });
      categories.forEach((categoryTasks, category) => {
        const categoryKey = `category-${category}`;
        rows.push({
          key: categoryKey,
          type: "category",
          name: category,
          count: categoryTasks.length,
        });
        if (this.collapsedCategories.has(categoryKey)) return;
        const ids = new Set(categoryTasks.map((schedule) => schedule.Id));
        categoryTasks
          .filter((schedule) => !ids.has(schedule.ParentId))
          .forEach((task) => {
            rows.push({
              key: `task-${task.Id}`,
              type: "task",
              schedule: task,
              child: false,
            });
            const children = categoryTasks.filter(
              (child) => child.ParentId === task.Id
            );
            if (children.length) {
              const appendChildren = (ParentId: number) => {
                categoryTasks
                  .filter((child) => child.ParentId === ParentId)
                  .forEach((child) => {
                    rows.push({
                      key: `task-${child.Id}`,
                      type: "task",
                      schedule: child,
                      child: true,
                    });
                    appendChildren(child.Id);
                  });
              };
              appendChildren(task.Id);
            }
          });
      });
      return rows;
    },
    intervals(): TimelineInterval[] {
      const result: TimelineInterval[] = [],
        count = this.zoom === "years" ? 12 : 12;
      for (let index = 0; index < count; index += 1) {
        let start: Date, end: Date, label: string;
        if (this.zoom === "weeks") {
          start = new Date(this.cursor.getTime() + index * 7 * dayMs);
          end = new Date(start.getTime() + 7 * dayMs);
          label = `${start.toLocaleDateString("en-US", {
            month: "short",
          })} ${start.getDate()}`;
        } else if (this.zoom === "months") {
          start = new Date(
            this.cursor.getFullYear(),
            this.cursor.getMonth() + index,
            1
          );
          end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
          label = start.toLocaleDateString("en-US", { month: "short" });
        } else {
          start = new Date(this.cursor.getFullYear() - 4 + index, 0, 1);
          end = new Date(start.getFullYear() + 1, 0, 1);
          label = String(start.getFullYear());
        }
        result.push({
          key: start.toISOString(),
          label,
          start,
          end,
          isWeekend: this.zoom === "weeks" && [0, 6].includes(start.getDay()),
        });
      }
      return result;
    },
    chartStyle(): Record<string, number> {
      return { "--interval-count": this.intervals.length };
    },
    rangeLabel(): string {
      return `${this.formatDate(this.intervals[0].start)} - ${this.formatDate(
        this.intervals[this.intervals.length - 1].end
      )}`;
    },
    todayPosition(): number | null {
      const start = this.intervals[0].start.getTime(),
        end = this.intervals[this.intervals.length - 1].end.getTime(),
        now = Date.now();
      return now >= start && now <= end
        ? ((now - start) / (end - start)) * 100
        : null;
    },
  },
  methods: {
    toggleCategory(key: string) {
      const next = new Set(this.collapsedCategories);
      next.has(key) ? next.delete(key) : next.add(key);
      this.collapsedCategories = next;
    },
    dateOf(value: Date | string) {
      return new Date(value);
    },
    barStyle(schedule: ScheduleModel) {
      const start = this.intervals[0].start.getTime(),
        end = this.intervals[this.intervals.length - 1].end.getTime(),
        duration = end - start,
        taskStart = this.dateOf(schedule.StartDate).getTime(),
        taskEnd = this.dateOf(schedule.EndDate).getTime(),
        rawLeft = ((taskStart - start) / duration) * 100,
        rawRight = ((taskEnd - start) / duration) * 100;
      if (rawRight <= 0 || rawLeft >= 100) return { display: "none" };
      const left = Math.max(0, rawLeft),
        right = Math.min(100, rawRight);
      return { left: `${left}%`, width: `${Math.max(1.5, right - left)}%` };
    },
    taskTitle(schedule: ScheduleModel) {
      return `${schedule.Name || "Untitled task"}: ${this.formatDate(
        this.dateOf(schedule.StartDate)
      )} - ${this.formatDate(this.dateOf(schedule.EndDate))}`;
    },
    formatDate(date: Date) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    setZoom(nextZoom: Zoom) {
      this.zoom = nextZoom;
      this.goToToday();
    },
    movePeriod(direction: number) {
      const step = this.zoom === "weeks" ? 7 : this.zoom === "months" ? 1 : 12;
      this.cursor = new Date(
        this.cursor.getFullYear(),
        this.cursor.getMonth() + direction * step,
        1
      );
    },
    goToToday() {
      const now = new Date();
      this.cursor = new Date(
        now.getFullYear(),
        this.zoom === "years" ? 0 : now.getMonth(),
        1
      );
    },
  },
});
</script>

<style scoped>
.roadmap {
  --ink: #111;
  --muted: #666;
  --line: #ddd;
  --task-green: #b9e3c2;
  --task-green-dark: #0dac2d;
  --label-width: 285px;
  max-width: 1200px;
  margin: 28px auto;
  padding: 28px;
  color: var(--ink);
  background: #fff;
  border: 1px solid white;
  border-radius: 8px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.08);
}
.roadmap__header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  margin-bottom: 24px;
}
.roadmap__eyebrow {
  margin: 0 0 5px;
  color: #111;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
h1 {
  margin: 0;
  font-family: Georgia, serif;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 500;
  letter-spacing: 0;
}
.roadmap__meta {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 13px;
}
.roadmap__meta span {
  padding: 0 5px;
  color: #111;
}
.roadmap__controls,
.roadmap__zoom {
  display: flex;
  gap: 5px;
  align-items: center;
}
.roadmap__zoom {
  padding: 3px;
  background: #fff;
  border-radius: 5px;
}
.roadmap__zoom-button,
.roadmap__nav,
.roadmap__today {
  height: 34px;
  padding: 0 11px;
  color: var(--ink);
  background: #fff;
  border: 1px solid #d7d7d7;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.roadmap__zoom-button {
  color: #777;
  border: 0;
  background: transparent;
}
.roadmap__zoom-button:hover {
  color: #111;
  background: #d6d6d6;
}
.roadmap__zoom-button--active {
  color: #111;
  background: #c7c7c7;
}
.roadmap__nav {
  min-width: 35px;
  padding: 0;
  font-size: 18px;
}
.roadmap__today {
  font-weight: 700;
}
.roadmap__nav:hover,
.roadmap__today:hover {
  border-color: #111;
  color: #111;
}
.roadmap__empty {
  padding: 54px 20px;
  color: var(--muted);
  text-align: center;
  border: 1px dashed #cbdad5;
  background: #fff;
}
.roadmap__scroll {
  overflow-x: auto;
  border: 1px solid var(--line);
  background: #fff;
}
.roadmap__chart {
  display: grid;
  grid-template-columns: var(--label-width) minmax(780px, 1fr);
  min-width: 1065px;
}
.roadmap__corner {
  display: flex;
  align-items: center;
  padding: 0 18px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.roadmap__timeline-head {
  display: grid;
  grid-template-columns: repeat(var(--interval-count), 1fr);
  height: 58px;
  border-bottom: 1px solid var(--line);
}
.roadmap__interval {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-left: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
.roadmap__interval--weekend,
.roadmap__grid--weekend {
  background: #f5f5f5;
}
.roadmap__label,
.roadmap__row {
  height: 92px;
  border-bottom: 1px solid var(--line);
}
.roadmap__label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  font-size: 13px;
}
.roadmap__label--category,
.roadmap__row--category {
  height: 40px;
  background: #f1f1f1;
  border-bottom-color: white;
}
.roadmap__label--category {
  color: #111;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.roadmap__section-button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.roadmap__section-button:hover {
  color: #555;
}
.roadmap__section-button--subcategory {
  gap: 8px;
}
.roadmap__label--subcategory,
.roadmap__row--subcategory {
  height: 46px;
  background: #fafafa;
}
.roadmap__label--subcategory {
  padding-left: 34px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
.roadmap__label--child {
  position: relative;
  padding-left: 66px;
  background: #fafafa;
}
.roadmap__label--child::before {
  content: "";
  position: absolute;
  top: -46px;
  bottom: 50%;
  left: 33px;
  border-left: 3px solid #111;
}
.roadmap__label--child::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 33px;
  width: 24px;
  border-top: 3px solid #111;
}
.roadmap__row--child {
  position: relative;
  background: #fafafa;
}
.roadmap__row--child::before {
  content: "";
  position: absolute;
  top: -46px;
  bottom: 50%;
  left: 13px;
  border-left: 3px solid #111;
}
.roadmap__row--child::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 13px;
  width: 24px;
  border-top: 3px solid #111;
}
.roadmap__category-mark {
  color: #111;
  font-size: 9px;
}
.roadmap__category-count {
  margin-left: auto;
  padding: 2px 7px;
  color: #111;
  background: #e5e5e5;
  border-radius: 10px;
  font-size: 10px;
  letter-spacing: 0;
}
.roadmap__subcategory-mark {
  color: #111;
  font-size: 16px;
  line-height: 1;
}
.roadmap__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  background: #111;
  border-radius: 50%;
}
.roadmap__task-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roadmap__percent {
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
}
.roadmap__rows {
  position: relative;
}
.roadmap__grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(var(--interval-count), 1fr);
  pointer-events: none;
}
.roadmap__grid span {
  border-left: 1px solid var(--line);
}
.roadmap__bar {
  position: absolute;
  top: 29px;
  height: 34px;
  min-width: 24px;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 5px;
  background: var(--task-green);
  cursor: pointer;
  box-shadow: inset 0 -5px rgba(0, 0, 0, 0.14);
}
.roadmap__bar-progress {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 0;
  display: block;
  background: var(--task-green-dark);
}
.roadmap__bar-name {
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  padding: 0 9px;
  color: #111;
  font-size: 12px;
  font-weight: 700;
  line-height: 34px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roadmap__bar:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.roadmap__today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 2px;
  background: #111;
  pointer-events: none;
}
.roadmap__today-line span {
  position: absolute;
  top: 7px;
  left: 5px;
  padding: 2px 5px;
  color: #fff;
  background: #111;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
}
@media (max-width: 700px) {
  .roadmap {
    margin: 12px;
    padding: 18px;
  }
  .roadmap__header {
    align-items: flex-start;
    flex-direction: column;
  }
  .roadmap__controls {
    flex-wrap: wrap;
  }
}
</style>
