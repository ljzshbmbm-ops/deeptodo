export const CATEGORIES = ["Personal", "Work", "Ideas", "Focus"];

export const PRIORITIES = ["high", "medium", "low"];

export const PRIORITY_LABELS = {
  high: "高",
  medium: "中",
  low: "低",
};

export const defaultData = {
  Personal: [],
  Work: [],
  Ideas: [],
  Focus: [],
};

export const EMPTY_GUIDES = {
  Personal: {
    title: "从这里开始",
    desc: "记录一件今天想完成的小事，开启你的高效一天。",
  },
  Work: {
    title: "规划你的工作",
    desc: "添加项目里程碑、会议待办或本周目标，让职业事务井井有条。",
  },
  Ideas: {
    title: "捕捉灵感火花",
    desc: "随时记下创意、阅读笔记或突发奇想，好点子不该被遗忘。",
  },
  Focus: {
    title: "设定专注目标",
    desc: "只放一件此刻最重要的事，配合番茄钟，进入深度心流状态。",
  },
};

export const MOTIVATIONAL = [
  (done, total) =>
    total === 0
      ? "今天从一个小目标开始，行动就是最好的计划。"
      : done === total
        ? "太棒了！今日任务全部完成，值得好好休息。"
        : `已完成 ${done}/${total}，保持节奏，你比想象中更接近目标。`,
  (done) =>
    done === 0
      ? "专注一件事，胜过分散十件事。"
      : "每勾选一项，都是向理想生活迈进的一小步。",
  (_, total, overdue) =>
    overdue > 0
      ? `有 ${overdue} 项任务已逾期，优先处理它们会减轻压力。`
      : total > 5
        ? "任务较多时，先做高优先级的一件。"
        : "清晰的目标，带来清晰的头脑。",
];

export function normalizeTask(task) {
  return {
    id: task.id,
    text: task.text || "",
    completed: !!task.completed,
    priority: PRIORITIES.includes(task.priority) ? task.priority : "medium",
    dueDate: task.dueDate || null,
    notes: task.notes || "",
  };
}

export function loadTodos() {
  const saved = localStorage.getItem("deepTodoData");
  if (!saved) return defaultData;

  try {
    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return {
        ...defaultData,
        Personal: parsed.map(normalizeTask),
      };
    }

    const merged = { ...defaultData, ...parsed };

    for (const key of CATEGORIES) {
      merged[key] = (merged[key] || []).map(normalizeTask);
    }

    return merged;
  } catch {
    return defaultData;
  }
}

export function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(dueDateStr) {
  if (!dueDateStr) return null;

  const due = new Date(`${dueDateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.round((due - today) / 86400000);
}

export function getDueStatus(dueDateStr) {
  const days = daysUntil(dueDateStr);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "normal";
}

export function formatDueLabel(dueDateStr) {
  if (!dueDateStr) return "截止";

  const days = daysUntil(dueDateStr);
  const [, m, d] = dueDateStr.split("-");

  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days === -1) return "昨天";
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;

  return `${Number(m)}/${Number(d)}`;
}

export function getTodayStats(todos) {
  const today = todayString();
  const all = CATEGORIES.flatMap((cat) =>
    todos[cat].map((t) => ({ ...t, category: cat }))
  );

  const dueToday = all.filter((t) => t.dueDate === today);
  const completedToday = dueToday.filter((t) => t.completed);
  const overdue = all.filter(
    (t) => !t.completed && getDueStatus(t.dueDate) === "overdue"
  );

  return {
    dueToday: dueToday.length,
    completedToday: completedToday.length,
    pendingToday: dueToday.filter((t) => !t.completed).length,
    overdue: overdue.length,
    totalActive: all.filter((t) => !t.completed).length,
  };
}

export function getMotivation(stats) {
  const idx = new Date().getDate() % MOTIVATIONAL.length;
  return MOTIVATIONAL[idx](
    stats.completedToday,
    stats.dueToday || stats.totalActive,
    stats.overdue
  );
}

export function playPomodoroSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    const t = ctx.currentTime;
    playTone(523.25, t, 0.15);
    playTone(659.25, t + 0.18, 0.15);
    playTone(783.99, t + 0.36, 0.35);
  } catch {
    /* ignore */
  }
}

export async function notifyPomodoroDone() {
  const title = "DeepTodo · 番茄钟";
  const body = "专注时间结束，起来休息一下吧。";

  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.svg" });
      return;
    }
    if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.svg" });
        return;
      }
    }
  }
}
