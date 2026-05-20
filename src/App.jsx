import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";

import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiMoon,
  FiSun,
  FiClock,
  FiBarChart2,
  FiUser,
  FiBriefcase,
  FiZap,
  FiTarget,
  FiChevronRight,
  FiInbox,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiMove,
  FiX,
} from "react-icons/fi";

import {
  CATEGORIES,
  VIEW_TODAY,
  PRIORITY_LABELS,
  EMPTY_GUIDES,
  loadTodos,
  normalizeTask,
  todayString,
  getDueStatus,
  formatDueLabel,
  getTodayStats,
  getSmartSuggestions,
  sortTasks,
  getTodayTasks,
  isValidView,
  playPomodoroSound,
  notifyPomodoroDone,
} from "./utils/tasks";

import "./App.css";

const CATEGORY_META = {
  Personal: { icon: FiUser, desc: "个人生活与日常事务" },
  Work: { icon: FiBriefcase, desc: "职业项目与协作任务" },
  Ideas: { icon: FiZap, desc: "灵感草稿与创意备忘" },
  Focus: { icon: FiTarget, desc: "深度专注与单一目标" },
  Today: { icon: FiCalendar, desc: "汇总所有分类中今天截止的任务" },
};

const FOCUS_QUOTE = "Wherever you are, be all there.";

function GridMenuIcon() {
  return (
    <svg
      className="grid-menu-icon"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1.25"
        y="1.25"
        width="5.75"
        height="5.75"
        rx="1.75"
        fill="currentColor"
      />
      <rect
        x="9"
        y="1.25"
        width="5.75"
        height="5.75"
        rx="1.75"
        fill="currentColor"
        fillOpacity="0.42"
      />
      <rect
        x="1.25"
        y="9"
        width="5.75"
        height="5.75"
        rx="1.75"
        fill="currentColor"
        fillOpacity="0.42"
      />
      <rect
        x="9"
        y="9"
        width="5.75"
        height="5.75"
        rx="1.75"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </svg>
  );
}

function BrandLogo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient
            id="brand-grad"
            x1="4"
            y1="2"
            x2="28"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="45%" stopColor="#5e6ad2" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient
            id="brand-shine"
            x1="16"
            y1="6"
            x2="16"
            y2="26"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter
            id="brand-glow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="9"
          fill="url(#brand-grad)"
          fillOpacity="0.18"
        />
        <rect
          x="1.5"
          y="1.5"
          width="29"
          height="29"
          rx="9"
          stroke="url(#brand-grad)"
          strokeWidth="1.25"
          filter="url(#brand-glow)"
        />
        <path
          d="M16 7.5L23.5 13v6L16 24.5L8.5 19v-6L16 7.5Z"
          stroke="url(#brand-grad)"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M16 11.5v5.5M13.2 14.2h5.6"
          stroke="url(#brand-shine)"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <circle cx="16" cy="14.2" r="2.2" fill="url(#brand-grad)" />
        <circle cx="16" cy="14" r="0.9" fill="#fff" fillOpacity="0.92" />
      </svg>
    </div>
  );
}

function ProgressRing({ value, size = 92 }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <motion.circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <div className="ring-label">
        <strong>{value}%</strong>
        <span>总进度</span>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  taskCategory,
  showCategoryBadge,
  expanded,
  reorderable = true,
  onToggleExpand,
  onToggleComplete,
  onCyclePriority,
  onUpdateDueDate,
  onUpdateNotes,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragTarget,
}) {
  const dueStatus = getDueStatus(task.dueDate);

  const inner = (
    <>
      <div
        className={`task-card ${expanded ? "expanded" : ""}`}
        onClick={(e) => {
          if (
            e.target.closest("button, input, textarea, label, .check, .due-date-wrap")
          ) {
            return;
          }
          onToggleExpand(task.id);
        }}
      >
        <span
          className="drag-handle"
          title="拖拽到其他分类"
          draggable
          onDragStart={(e) => onDragStart(e, task, taskCategory)}
          onDragEnd={onDragEnd}
        >
          <FiMove />
        </span>

        <div
          className={`check ${task.completed ? "checked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task.id);
          }}
          role="checkbox"
          aria-checked={task.completed}
        />

        <button
          type="button"
          className={`priority-tag ${task.priority || "medium"}`}
          onClick={() => onCyclePriority(task.id)}
          title="点击切换优先级"
        >
          {PRIORITY_LABELS[task.priority || "medium"]}
        </button>

        <div className="task-main">
          <div className="task-title-row">
            {showCategoryBadge && (
              <span className="category-badge">{taskCategory}</span>
            )}
            <span className="task-text-wrap">
              <span
                className={`task-text ${task.completed ? "completed" : ""}`}
              >
                {task.text}
              </span>
            </span>
          </div>

          <div className="task-meta-row">
            <label className={`due-date-wrap due-${dueStatus}`}>
              <FiCalendar />
              <span>{formatDueLabel(task.dueDate)}</span>
              <input
                type="date"
                className="due-date-input"
                value={task.dueDate || ""}
                onChange={(e) =>
                  onUpdateDueDate(task.id, e.target.value || null)
                }
                onClick={(e) => e.stopPropagation()}
              />
            </label>

            {task.notes ? (
              <span className="has-notes">有备注</span>
            ) : null}

            <button
              type="button"
              className="expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(task.id);
              }}
              aria-label={expanded ? "收起备注" : "展开备注"}
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          </div>
        </div>

        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          aria-label="删除任务"
        >
          <FiTrash2 />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="task-notes-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              className="task-notes-input"
              placeholder="添加备注或任务详情…"
              value={task.notes || ""}
              onChange={(e) => onUpdateNotes(task.id, e.target.value)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (!reorderable) {
    return (
      <div className={`task-item ${isDragTarget ? "drag-target" : ""}`}>
        {inner}
      </div>
    );
  }

  return (
    <Reorder.Item
      value={task}
      whileDrag={{ scale: 1.01, boxShadow: "var(--shadow-md)" }}
      className={`task-item ${isDragTarget ? "drag-target" : ""}`}
    >
      {inner}
    </Reorder.Item>
  );
}

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("deepTodoTheme") || "dark"
  );
  const [category, setCategory] = useState(() => {
    const saved = localStorage.getItem("deepTodoCategory");
    return isValidView(saved) ? saved : "Personal";
  });
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropCategory, setDropCategory] = useState(null);
  const [toast, setToast] = useState(null);
  const [celebrateOpen, setCelebrateOpen] = useState(false);

  const [todos, setTodos] = useState(loadTodos);
  const [seconds, setSeconds] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);

  const inputRef = useRef();
  const mainScrollRef = useRef(null);
  const pomodoroFiredRef = useRef(false);

  const isTodayView = category === VIEW_TODAY;

  const sortedCategoryTodos = useMemo(
    () => (isTodayView ? [] : sortTasks(todos[category] || [])),
    [todos, category, isTodayView]
  );

  const todayTaskList = useMemo(() => getTodayTasks(todos), [todos]);

  const categoryMeta = CATEGORY_META[category] || CATEGORY_META.Personal;
  const CategoryIcon = categoryMeta.icon;
  const EmptyIcon = categoryMeta.icon;

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    const q = searchQuery.trim().toLowerCase();

    return CATEGORIES.flatMap((cat) =>
      todos[cat]
        .filter(
          (t) =>
            t.text.toLowerCase().includes(q) ||
            (t.notes || "").toLowerCase().includes(q)
        )
        .map((t) => ({ task: t, category: cat }))
    );
  }, [searchQuery, todos, isSearching]);

  const displayList = isSearching
    ? searchResults
    : isTodayView
      ? todayTaskList
      : sortedCategoryTodos.map((t) => ({ task: t, category }));

  const listCount = isTodayView
    ? todayTaskList.length
    : sortedCategoryTodos.length;

  const categoryDone = useMemo(() => {
    if (isTodayView) {
      return todayTaskList.filter((x) => x.task.completed).length;
    }
    return sortedCategoryTodos.filter((t) => t.completed).length;
  }, [isTodayView, todayTaskList, sortedCategoryTodos]);

  const todayStats = useMemo(() => getTodayStats(todos), [todos]);
  const smartSuggestions = useMemo(
    () => getSmartSuggestions(todos),
    [todos]
  );

  const updateCategory = (cat, updater) => {
    setTodos((prev) => ({
      ...prev,
      [cat]: updater(prev[cat]),
    }));
  };

  useEffect(() => {
    localStorage.setItem("deepTodoData", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("deepTodoTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("deepTodoCategory", category);
  }, [category]);

  useEffect(() => {
    if (!timerRunning) {
      pomodoroFiredRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (seconds !== 0 || timerRunning || pomodoroFiredRef.current) return;

    pomodoroFiredRef.current = true;
    playPomodoroSound();
    notifyPomodoroDone();
    setCelebrateOpen(true);
    setSeconds(1500);
  }, [seconds, timerRunning]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const down = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const showToast = (msg) => setToast(msg);

  const addTask = () => {
    if (!input.trim()) return;

    const targetCategory = isTodayView ? "Personal" : category;

    const newTask = normalizeTask({
      id: Date.now(),
      text: input,
      completed: false,
      priority: "medium",
      dueDate: isTodayView ? todayString() : null,
      notes: "",
    });

    updateCategory(targetCategory, (list) =>
      sortTasks([...list, newTask])
    );
    setInput("");
    inputRef.current?.focus();

    if (isTodayView) {
      showToast(`已添加至 Personal，截止今日`);
    }
  };

  const resolveCat = (cat) => {
    if (cat) return cat;
    return isTodayView ? null : category;
  };

  const deleteTask = (id, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    updateCategory(targetCat, (list) => list.filter((t) => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleComplete = (id, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;

    updateCategory(targetCat, (list) =>
      sortTasks(
        list.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      )
    );
  };

  const cyclePriority = (id, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    const PRIORITIES = ["high", "medium", "low"];
    updateCategory(targetCat, (list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        const idx = PRIORITIES.indexOf(t.priority || "medium");
        return {
          ...t,
          priority: PRIORITIES[(idx + 1) % PRIORITIES.length],
        };
      })
    );
  };

  const updateDueDate = (id, dueDate, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    updateCategory(targetCat, (list) =>
      sortTasks(
        list.map((t) => (t.id === id ? { ...t, dueDate } : t))
      )
    );
  };

  const updateNotes = (id, notes, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    updateCategory(targetCat, (list) =>
      list.map((t) => (t.id === id ? { ...t, notes } : t))
    );
  };

  const scrollMainToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchCategory = (item) => {
    setCategory(item);
    setInput("");
    setExpandedId(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollMainToTop);
    });
  };

  const moveTaskToCategory = (taskId, fromCat, toCat) => {
    if (fromCat === toCat) return;
    const task = todos[fromCat].find((t) => t.id === taskId);
    if (!task) return;

    setTodos((prev) => ({
      ...prev,
      [fromCat]: prev[fromCat].filter((t) => t.id !== taskId),
      [toCat]: [...prev[toCat], task],
    }));

    if (expandedId === taskId) setExpandedId(null);
    showToast(`已移动到 ${toCat}`);
  };

  const handleDragStart = (e, task, fromCat) => {
    setDragging({ task, fromCat });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ id: task.id, fromCat })
    );
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDropCategory(null);
  };

  const handleNavDragOver = (e, cat) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropCategory(cat);
  };

  const handleNavDrop = (e, toCat) => {
    e.preventDefault();
    try {
      const { id, fromCat } = JSON.parse(
        e.dataTransfer.getData("application/json")
      );
      if (toCat === VIEW_TODAY) return;
      moveTaskToCategory(id, fromCat, toCat);
      if (toCat !== category) switchCategory(toCat);
    } catch {
      /* ignore */
    }
    handleDragEnd();
  };

  const startTimer = async () => {
    if (!timerRunning && "Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }
    setTimerRunning((r) => !r);
  };

  const completedCount = useMemo(
    () => Object.values(todos).flat().filter((t) => t.completed).length,
    [todos]
  );

  const totalCount = useMemo(
    () => Object.values(todos).flat().length,
    [todos]
  );

  const progress =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const formatTime = () => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const emptyGuide = EMPTY_GUIDES[category];

  const reorderCurrent = (newOrder) => {
    if (isSearching || isTodayView) return;
    setTodos((prev) => ({
      ...prev,
      [category]: sortTasks(newOrder),
    }));
  };

  return (
    <div className={`app ${theme}`}>
      <div className="background-glow" aria-hidden="true" />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo />
          <div className="logo-text">
            <div className="logo-title" aria-label="DeepTodo">
              <span className="logo-deep">Deep</span>
              <span className="logo-todo">Todo</span>
            </div>
            <p className="logo-sub">{FOCUS_QUOTE}</p>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">视图</span>
          <nav className="menu menu-today">
            <motion.button
              whileTap={{ scale: 0.98 }}
              className={isTodayView ? "active" : ""}
              onClick={() => switchCategory(VIEW_TODAY)}
            >
              <FiCalendar className="nav-icon" />
              <span className="nav-label">今日</span>
              <span className="nav-count">{todayTaskList.length}</span>
            </motion.button>
          </nav>

          <span className="sidebar-label">工作区</span>
          <nav className="menu">
            {CATEGORIES.map((item) => {
              const Icon = CATEGORY_META[item].icon;
              const isDrop = dropCategory === item && dragging;

              return (
                <motion.button
                  key={item}
                  whileTap={{ scale: 0.98 }}
                  className={`${category === item ? "active" : ""} ${isDrop ? "drop-hover" : ""}`}
                  onClick={() => switchCategory(item)}
                  onDragOver={(e) => handleNavDragOver(e, item)}
                  onDragLeave={() => setDropCategory(null)}
                  onDrop={(e) => handleNavDrop(e, item)}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item}</span>
                  <span className="nav-count">{todos[item].length}</span>
                </motion.button>
              );
            })}
          </nav>
          {dragging && (
            <p className="drag-hint">松开以移动到高亮分类</p>
          )}
        </div>

        <div className="sidebar-bottom">
          <p className="slogan-quote">「专注当下，完成重要的事。」</p>
          <p className="slogan-sub">数据已自动保存至本地 · ⌘K 命令面板</p>
        </div>
      </aside>

      <main className="main">
        <div className="main-scroll" ref={mainScrollRef}>
          <header className="page-header">
            <div className="page-header-main">
              <div className="breadcrumb">
                <span>工作区</span>
                <FiChevronRight />
                <span>{category}</span>
              </div>
              <h1 className="page-title">{category}</h1>
              <p className="page-desc">{categoryMeta.desc}</p>
            </div>

            <div className="header-meta">
              <ProgressRing value={progress} />
              <div className="header-stats-inline">
                <div className="inline-stat">
                  <strong>{listCount}</strong>
                  <span>{isTodayView ? "今日" : "当前"}</span>
                </div>
                <div className="inline-stat">
                  <strong>{categoryDone}</strong>
                  <span>已完成</span>
                </div>
              </div>
            </div>

            <div className="topbar-actions">
              <button
                className="icon-btn"
                onClick={() =>
                  setTheme(theme === "dark" ? "light" : "dark")
                }
                aria-label={
                  theme === "dark" ? "切换到白天模式" : "切换到黑夜模式"
                }
              >
                {theme === "dark" ? <FiSun /> : <FiMoon />}
              </button>
              <button
                type="button"
                className="icon-btn grid-menu-btn"
                onClick={() => setCommandOpen(true)}
                aria-label="打开命令面板"
                title="命令面板 ⌘K"
              >
                <GridMenuIcon />
                <span className="grid-menu-kbd">⌘K</span>
              </button>
            </div>
          </header>

          <div className="search-bar">
            <FiSearch />
            <input
              type="search"
              placeholder="搜索任务标题或备注…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="清除搜索"
              >
                <FiX />
              </button>
            )}
          </div>

          {!isSearching && (
            <motion.div layout className="composer">
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  isTodayView
                    ? "添加今日任务（保存至 Personal · 截止今天）…"
                    : `在 ${category} 中添加任务…`
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
              />
              <motion.button
                className="composer-add"
                whileTap={{ scale: 0.97 }}
                onClick={addTask}
              >
                <FiPlus />
                添加
              </motion.button>
            </motion.div>
          )}

          <div className="workspace-grid">
            <section className="panel tasks-panel">
              <div className="panel-header">
                <h3>
                  <CategoryIcon />
                  {isSearching ? "搜索结果" : "任务列表"}
                </h3>
                <span className="panel-badge">
                  {isSearching
                    ? `${displayList.length} 条匹配`
                    : `${listCount} 项`}
                </span>
              </div>

              <div className="panel-body">
                {!isSearching && listCount === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <EmptyIcon />
                    </div>
                    <h4>{emptyGuide.title}</h4>
                    <p>{emptyGuide.desc}</p>
                  </div>
                ) : isSearching && displayList.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FiSearch />
                    </div>
                    <h4>未找到匹配任务</h4>
                    <p>试试其他关键词，或检查备注内容</p>
                  </div>
                ) : isSearching || isTodayView ? (
                  <ul className="task-list search-results">
                    <AnimatePresence>
                      {displayList.map(({ task, category: cat }) => (
                        <TaskRow
                          key={`${cat}-${task.id}`}
                          task={task}
                          taskCategory={cat}
                          showCategoryBadge={isTodayView || isSearching}
                          reorderable={false}
                          expanded={expandedId === task.id}
                            onToggleExpand={(id) =>
                              setExpandedId((prev) =>
                                prev === id ? null : id
                              )
                            }
                            onToggleComplete={(id) =>
                              toggleComplete(id, cat)
                            }
                            onCyclePriority={(id) =>
                              cyclePriority(id, cat)
                            }
                            onUpdateDueDate={(id, d) =>
                              updateDueDate(id, d, cat)
                            }
                            onUpdateNotes={(id, n) =>
                              updateNotes(id, n, cat)
                            }
                            onDelete={(id) => deleteTask(id, cat)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragTarget={false}
                          />
                      ))}
                    </AnimatePresence>
                  </ul>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={sortedCategoryTodos}
                    onReorder={reorderCurrent}
                    className="task-list"
                  >
                    <AnimatePresence>
                      {sortedCategoryTodos.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          taskCategory={category}
                          showCategoryBadge={false}
                          expanded={expandedId === task.id}
                          onToggleExpand={(id) =>
                            setExpandedId((prev) =>
                              prev === id ? null : id
                            )
                          }
                          onToggleComplete={(id) =>
                            toggleComplete(id, category)
                          }
                          onCyclePriority={(id) =>
                            cyclePriority(id, category)
                          }
                          onUpdateDueDate={(id, d) =>
                            updateDueDate(id, d, category)
                          }
                          onUpdateNotes={(id, n) =>
                            updateNotes(id, n, category)
                          }
                          onDelete={(id) => deleteTask(id, category)}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragTarget={
                            dragging?.task.id === task.id
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                )}
              </div>
            </section>

            <aside className="insight-column">
              <div className="panel insight-card">
                <div className="panel-header">
                  <h3>
                    <FiClock />
                    专注计时
                  </h3>
                </div>
                <div className="panel-body">
                  <div
                    className={`timer-display ${timerRunning ? "running" : ""}`}
                  >
                    {formatTime()}
                  </div>
                  <div className="timer-buttons">
                    <button onClick={startTimer}>
                      {timerRunning ? "暂停" : "开始"}
                    </button>
                    <button
                      onClick={() => {
                        setTimerRunning(false);
                        setSeconds(1500);
                        pomodoroFiredRef.current = false;
                      }}
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel insight-card">
                <div className="panel-header">
                  <h3>
                    <FiBarChart2 />
                    数据概览
                  </h3>
                </div>
                <div className="panel-body">
                  <div className="analytics-grid">
                    <div className="analytics-cell">
                      <strong>{totalCount}</strong>
                      <span>全部</span>
                    </div>
                    <div className="analytics-cell">
                      <strong>{completedCount}</strong>
                      <span>完成</span>
                    </div>
                    <div className="analytics-cell">
                      <strong>{progress}%</strong>
                      <span>进度</span>
                    </div>
                  </div>
                  <div className="progress-section">
                    <div className="progress-header">
                      <span>完成率</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="progress-fill"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel insight-card insight-smart">
                <div className="panel-header">
                  <h3>智能建议</h3>
                  <span className="panel-badge">{todayString()}</span>
                </div>
                <div className="panel-body">
                  <div className="today-stats compact">
                    <div className="today-stat">
                      <strong>{todayStats.pendingToday}</strong>
                      <span>今日待办</span>
                    </div>
                    <div className="today-stat">
                      <strong>{todayStats.overdue}</strong>
                      <span>已逾期</span>
                    </div>
                  </div>
                  <ul className="smart-suggestions">
                    {smartSuggestions.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <FiClock />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrateOpen && (
          <motion.div
            className="celebrate-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCelebrateOpen(false)}
          >
            <motion.div
              className="celebrate-modal"
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="celebrate-burst" aria-hidden />
              <div className="celebrate-icon">✓</div>
              <h2>专注完成！</h2>
              <p>本轮番茄钟圆满结束，休息一下吧</p>
              <button
                type="button"
                className="celebrate-btn"
                onClick={() => setCelebrateOpen(false)}
              >
                太棒了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commandOpen && (
          <motion.div
            className="command-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandOpen(false)}
          >
            <motion.div
              className="command-menu"
              initial={{ y: 12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 8, opacity: 0, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="command-search">
                <FiSearch />
                <input placeholder="搜索或跳转工作区…" autoFocus />
              </div>
              <div className="command-items">
                <button
                  onClick={() => {
                    switchCategory(VIEW_TODAY);
                    setCommandOpen(false);
                  }}
                >
                  打开今日视图
                  <span>↵</span>
                </button>
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      switchCategory(item);
                      setCommandOpen(false);
                    }}
                  >
                    打开 {item}
                    <span>↵</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
