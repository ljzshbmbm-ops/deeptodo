export const CATEGORIES = ["Personal", "Work", "Ideas", "Focus"];

export const VIEW_TODAY = "Today";

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
  Today: {
    title: "今日暂无到期任务",
    desc: "为任务设置截止日期为今天，它们会出现在这里。也可在下方快速添加。",
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

export function sortTasks(list) {
  const incomplete = list.filter((t) => !t.completed);
  const completed = list.filter((t) => t.completed);
  return [...incomplete, ...completed];
}

export function getTodayTasks(todos) {
  const today = todayString();

  return CATEGORIES.flatMap((cat) =>
    todos[cat]
      .filter((t) => t.dueDate === today)
      .map((task) => ({ task, category: cat }))
  ).sort((a, b) => {
    if (a.task.completed !== b.task.completed) {
      return a.task.completed ? 1 : -1;
    }
    const order = { high: 0, medium: 1, low: 2 };
    return (
      (order[a.task.priority] ?? 1) - (order[b.task.priority] ?? 1)
    );
  });
}

export function getSmartSuggestions(todos) {
  const today = todayString();
  const all = CATEGORIES.flatMap((cat) =>
    todos[cat].map((t) => ({ ...t, category: cat }))
  );
  const active = all.filter((t) => !t.completed);
  const suggestions = [];

  const highPending = active.filter((t) => t.priority === "high");
  const highToday = highPending.filter((t) => t.dueDate === today);

  if (highToday.length > 0) {
    suggestions.push(
      `今日还有 ${highToday.length} 件高优先级任务未完成，建议优先处理。`
    );
  } else if (highPending.length > 0) {
    suggestions.push(
      `共有 ${highPending.length} 件高优先级任务待办，可安排一段专注时间攻克。`
    );
  }

  const overdue = active.filter(
    (t) => getDueStatus(t.dueDate) === "overdue"
  );
  if (overdue.length > 0) {
    suggestions.push(
      `${overdue.length} 项任务已过期，拖越久压力越大，今天先清掉一件吧。`
    );
  }

  const dueSoon = active.filter((t) => {
    const days = daysUntil(t.dueDate);
    return days !== null && days > 0 && days <= 3;
  });
  if (dueSoon.length > 0) {
    suggestions.push(
      `${dueSoon.length} 项任务将在 3 天内到期，提前规划可避免手忙脚乱。`
    );
  }

  const pendingToday = active.filter((t) => t.dueDate === today);
  if (pendingToday.length > 0 && !suggestions.some((s) => s.includes("今日"))) {
    suggestions.push(
      `今日到期 ${pendingToday.length} 项任务，按优先级逐个勾选会更有成就感。`
    );
  }

  const noDue = active.filter((t) => !t.dueDate);
  if (noDue.length >= 3) {
    suggestions.push(
      `${noDue.length} 项任务未设截止日期，加上截止日更容易推进。`
    );
  }

  if (active.length === 0) {
    suggestions.push("所有任务都已完成，太棒了！适合休息或规划明天。");
  } else if (suggestions.length === 0) {
    suggestions.push("节奏不错，保持专注，一次只做一件事。");
  }

  return suggestions.slice(0, 4);
}

export function isValidView(view) {
  return view === VIEW_TODAY || CATEGORIES.includes(view);
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
