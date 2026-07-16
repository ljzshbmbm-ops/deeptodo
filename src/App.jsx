import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "framer-motion";

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
  FiStar,
  FiEdit2,
  FiRotateCcw,
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
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(12);
  }
}

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
  isMobile = false,
  editing = false,
  fullExpand = false,
  editInputRef,
  onToggleExpand,
  onToggleComplete,
  onCyclePriority,
  onUpdateDueDate,
  onUpdateNotes,
  onDelete,
  onTogglePin,
  onToggleFavorite,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDragStart,
  onDragEnd,
  isDragTarget,
}) {
  const dueStatus = getDueStatus(task.dueDate);
  const dragControls = useDragControls();
  const longPressTimer = useRef(null);
  const pressOrigin = useRef({ x: 0, y: 0 });
  const categoryDragReady = useRef(false);

  const [pressState, setPressState] = useState("idle");
  const pressStateRef = useRef("idle");

  const setPress = (state) => {
    pressStateRef.current = state;
    setPressState(state);
  };

  const cancelLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleHandlePointerDown = (e) => {
    if (!isMobile) return;

    e.stopPropagation();
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    setPress("pending");

    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      triggerHaptic();
      setPress("armed");
      categoryDragReady.current = true;

      if (reorderable) {
        dragControls.start(e);
      }
    }, LONG_PRESS_MS);
  };

  const handleHandlePointerMove = (e) => {
    if (!isMobile || !longPressTimer.current) return;

    const dx = e.clientX - pressOrigin.current.x;
    const dy = e.clientY - pressOrigin.current.y;

    if (
      Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD ||
      Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD
    ) {
      cancelLongPressTimer();
      setPress("idle");
    }
  };

  const handleHandlePointerUp = () => {
    cancelLongPressTimer();
    if (pressStateRef.current === "pending") {
      setPress("idle");
      categoryDragReady.current = false;
    }
  };

  const handleNativeDragStart = (e) => {
    if (isMobile && !categoryDragReady.current) {
      e.preventDefault();
      return;
    }
    onDragStart(e, task, taskCategory);
  };

  const handleNativeDragEnd = (e) => {
    categoryDragReady.current = false;
    setPress("idle");
    onDragEnd(e);
  };

  const taskItemClass = [
    "task-item",
    isDragTarget ? "drag-target" : "",
    pressState === "pending" ? "long-press-pending" : "",
    pressState === "armed" ? "long-press-armed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <div
        className={`task-card ${expanded ? "expanded" : ""} ${fullExpand ? "full-expand" : ""}`}
        onClick={(e) => {
          if (
            editing ||
            e.target.closest(
              "button, input, textarea, label, .check, .due-date-wrap, .drag-handle"
            )
          ) {
            return;
          }
          onToggleExpand(task.id);
        }}
        onDoubleClick={(e) => {
          if (
            e.target.closest(
              "button, input, textarea, label, .check, .due-date-wrap, .drag-handle"
            )
          ) {
            return;
          }
          e.preventDefault();
          // 双击切换到全展开模式
          onToggleExpand(task.id, true);
        }}
      >
        <span
          className="drag-handle"
          title={
            isMobile
              ? "长按 0.5 秒拖动排序或移动分类"
              : "拖拽到其他分类"
          }
          draggable={!isMobile}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          onContextMenu={(e) => isMobile && e.preventDefault()}
          onDragStart={handleNativeDragStart}
          onDragEnd={handleNativeDragEnd}
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
              {editing ? (
                <input
                  ref={editInputRef}
                  className="task-edit-input"
                  defaultValue={task.text}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSaveEdit(task.id, e.target.value);
                    } else if (e.key === "Escape") {
                      onCancelEdit(task.id);
                    }
                  }}
                  onBlur={(e) => onSaveEdit(task.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`task-text ${task.completed ? "completed" : ""}`}
                >
                  {task.text}
                </span>
              )}
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

            {task.pinned && <span className="meta-badge meta-pinned">置顶</span>}
            {task.favorite && <span className="meta-badge meta-fav">收藏</span>}
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

        <div className="task-actions">
          <button
            className={`action-btn pin-btn ${task.pinned ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(task.id);
            }}
            aria-label={task.pinned ? "取消置顶" : "置顶"}
            title={task.pinned ? "取消置顶" : "置顶"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-6.5a3.5 3.5 0 0 0-3.5-3.5h-7A3.5 3.5 0 0 0 5 10.5V17z" />
              <path d="M12 2v5" />
            </svg>
          </button>
          <button
            className={`action-btn fav-btn ${task.favorite ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(task.id);
            }}
            aria-label={task.favorite ? "取消收藏" : "收藏"}
            title={task.favorite ? "取消收藏" : "收藏"}
          >
            <FiStar
              fill={task.favorite ? "currentColor" : "none"}
            />
          </button>
          <button
            className="action-btn edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit(task.id);
            }}
            aria-label="编辑任务"
            title="编辑任务"
          >
            <FiEdit2 />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            aria-label="删除任务"
            title="删除任务"
          >
            <FiTrash2 />
          </button>
        </div>
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
              className={`task-notes-input ${fullExpand ? "full-expand-notes" : ""}`}
              placeholder="添加备注或任务详情…"
              value={task.notes || ""}
              onChange={(e) => onUpdateNotes(task.id, e.target.value)}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = Math.max(el.scrollHeight, fullExpand ? 200 : 72) + "px";
                }
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.max(e.target.scrollHeight, fullExpand ? 200 : 72) + "px";
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (!reorderable) {
    return <div className={taskItemClass}>{inner}</div>;
  }

  return (
    <Reorder.Item
      value={task}
      dragListener={!isMobile}
      dragControls={dragControls}
      whileDrag={{
        scale: isMobile ? 1.04 : 1.01,
        boxShadow: "var(--shadow-lg)",
      }}
      className={taskItemClass}
      onDragEnd={() => {
        setPress("idle");
        categoryDragReady.current = false;
      }}
    >
      {inner}
    </Reorder.Item>
  );
}

function App() {
  const isMobile = useIsMobile();

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
  const [commandQuery, setCommandQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [fullExpandId, setFullExpandId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropCategory, setDropCategory] = useState(null);
  const [toast, setToast] = useState(null);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [filterMode, setFilterMode] = useState(null); // null | 'active' | 'completed'
  const [showInsight, setShowInsight] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileAdd, setShowMobileAdd] = useState(false);

  const [todos, setTodos] = useState(loadTodos);
  const [seconds, setSeconds] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);

  const inputRef = useRef();
  const mainScrollRef = useRef(null);
  const pomodoroFiredRef = useRef(false);
  const editInputRef = useRef(null);
  const undoDeleteRef = useRef(null);
  const [deletedHistory, setDeletedHistory] = useState([]);

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

  const displayList = useMemo(() => {
    let list = isSearching
      ? searchResults
      : isTodayView
        ? todayTaskList
        : sortedCategoryTodos.map((t) => ({ task: t, category }));
    if (filterMode === "active") {
      list = list.filter((x) => !x.task.completed);
    } else if (filterMode === "completed") {
      list = list.filter((x) => x.task.completed);
    }
    return list;
  }, [isSearching, searchResults, isTodayView, todayTaskList, sortedCategoryTodos, category, filterMode]);

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

  const filteredCommands = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    const all = [
      { label: "打开今日视图", cat: VIEW_TODAY },
      ...CATEGORIES.map((c) => ({ label: `打开 ${c}`, cat: c })),
    ];
    if (!q) return all;
    return all.filter((c) => c.label.toLowerCase().includes(q));
  }, [commandQuery]);

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
    if (!commandOpen) setCommandQuery("");
  }, [commandOpen]);

  useEffect(() => {
    const down = (e) => {
      // Ctrl+K / Ctrl+Shift+K 打开命令面板
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }
      // 按 / 快速打开命令面板（不在输入框/文本框内时）
      if (
        e.key === "/" &&
        !commandOpen &&
        !["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
        !e.target.isContentEditable
      ) {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const showToast = (message, undo) => {
    setToast({ message, undo: undo || null, key: Date.now() });
  };

  const dismissToast = () => setToast(null);

  const toggleExpand = (id, forceFull = false) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (forceFull) {
        // 双击：强制展开并进入全展开模式
        next.add(id);
        setFullExpandId(id);
      } else if (next.has(id)) {
        // 单击已展开的：收起
        next.delete(id);
        setFullExpandId(null);
      } else {
        // 单击未展开的：展开
        next.add(id);
        setFullExpandId(null);
      }
      return next;
    });
  };

  const expandAllTasks = () => {
    const list = isSearching
      ? (searchResults || []).map((x) => x.task.id)
      : isTodayView
        ? (todayTaskList || []).map((x) => x.task.id)
        : (sortedCategoryTodos || []).map((t) => t.id);
    setExpandedIds(new Set(list));
  };

  const collapseAllTasks = () => {
    setExpandedIds(new Set());
  };

  const recentlyCompleted = useMemo(() => {
    return CATEGORIES.flatMap((cat) =>
      (todos[cat] || [])
        .filter((t) => t.completed)
        .map((t) => ({ ...t, category: cat }))
    )
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  }, [todos]);

  const isAllExpanded =
    listCount > 0 &&
    ((isSearching
      ? (searchResults || []).every((x) => expandedIds.has(x.task.id))
      : isTodayView
        ? (todayTaskList || []).every((x) => expandedIds.has(x.task.id))
        : (sortedCategoryTodos || []).every((t) => expandedIds.has(t.id))));

  const startEdit = (id) => {
    setEditingId(id);
    // 等 DOM 更新后聚焦
    requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const restoreFromHistory = (historyEntry) => {
    updateCategory(historyEntry.cat, (list) =>
      sortTasks([...list, historyEntry.task])
    );
    setDeletedHistory((prev) =>
      prev.filter((h) => h.task.id !== historyEntry.task.id)
    );
    showToast("已恢复任务");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ todos, deletedHistory }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deeptodo-backup-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("数据已导出为 JSON 文件");
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.todos) {
            setTodos((prev) => {
              // 合并导入的数据
              const merged = { ...prev };
              for (const cat of CATEGORIES) {
                const existing = new Set((prev[cat] || []).map((t) => t.id));
                const incoming = (data.todos[cat] || []).filter(
                  (t) => !existing.has(t.id)
                );
                merged[cat] = sortTasks([...prev[cat], ...incoming.map(normalizeTask)]);
              }
              return merged;
            });
            if (data.deletedHistory) {
              setDeletedHistory((prev) => {
                const existingIds = new Set(prev.map((h) => h.task.id));
                const incoming = data.deletedHistory.filter(
                  (h) => !existingIds.has(h.task.id)
                );
                return [...incoming, ...prev].slice(0, 20);
              });
            }
            showToast("数据已导入");
          } else {
            showToast("文件格式不正确");
          }
        } catch {
          showToast("文件解析失败");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

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

    // 先找到要删的任务，用于撤销
    const taskToDelete = (todos[targetCat] || []).find((t) => t.id === id);
    if (!taskToDelete) return;

    // 清除之前的撤销定时器
    if (undoDeleteRef.current) {
      clearTimeout(undoDeleteRef.current.timer);
    }

    // 从列表移除
    updateCategory(targetCat, (list) => list.filter((t) => t.id !== id));
    setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });

    // 存储撤销信息
    undoDeleteRef.current = {
      task: taskToDelete,
      cat: targetCat,
      timer: null,
    };

    // 记录到删除历史
    const historyEntry = {
      task: taskToDelete,
      cat: targetCat,
      deletedAt: Date.now(),
    };
    setDeletedHistory((prev) => [historyEntry, ...prev].slice(0, 20));

    // 4.5 秒后真删（仅清除撤销引用）
    undoDeleteRef.current.timer = setTimeout(() => {
      undoDeleteRef.current = null;
    }, 4500);

    showToast("已删除", {
      label: "撤销",
      action: () => {
        // 清除定时器
        if (undoDeleteRef.current) {
          clearTimeout(undoDeleteRef.current.timer);
          const { task: restoredTask, cat: restoreCat } = undoDeleteRef.current;
          undoDeleteRef.current = null;
          // 恢复任务
          updateCategory(restoreCat, (list) =>
            sortTasks([...list, restoredTask])
          );
          // 从删除历史移除
          setDeletedHistory((prev) =>
            prev.filter((h) => h.task.id !== restoredTask.id)
          );
        }
        dismissToast();
      },
    });
  };

  const togglePin = (id, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    updateCategory(targetCat, (list) =>
      sortTasks(
        list.map((t) =>
          t.id === id ? { ...t, pinned: !t.pinned } : t
        )
      )
    );
  };

  const toggleFavorite = (id, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    updateCategory(targetCat, (list) =>
      list.map((t) =>
        t.id === id ? { ...t, favorite: !t.favorite } : t
      )
    );
  };

  const saveEdit = (id, text, cat) => {
    const targetCat = resolveCat(cat);
    if (!targetCat) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    updateCategory(targetCat, (list) =>
      list.map((t) => (t.id === id ? { ...t, text: trimmed } : t))
    );
    setEditingId(null);
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

    setExpandedIds((prev) => { const next = new Set(prev); next.delete(taskId); return next; });
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

      <aside className="sidebar sidebar--desktop">
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
          <div className="sidebar-actions">
            <button className="sidebar-action-btn" onClick={exportData} title="导出数据 JSON">
              导出数据
            </button>
            <button className="sidebar-action-btn" onClick={importData} title="导入数据 JSON">
              导入数据
            </button>
          </div>
          <p className="slogan-sub">数据已自动保存至本地 · Ctrl+K 命令面板</p>
        </div>
      </aside>

      <main className="main">
        <header className="mobile-header">
          <div className="mobile-brand">
            <BrandLogo />
            <div className="mobile-brand-text">
              <span className="logo-deep">Deep</span>
              <span className="logo-todo">Todo</span>
            </div>
          </div>
          <div className="mobile-header-actions">
            <button
              type="button"
              className={`icon-btn mobile-today-btn ${isTodayView ? "active" : ""}`}
              onClick={() => switchCategory(VIEW_TODAY)}
              aria-label="今日视图"
            >
              <FiCalendar />
            </button>
            <button
              type="button"
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
            >
              <GridMenuIcon />
            </button>
          </div>
        </header>

        <div className="main-scroll" ref={mainScrollRef}>
          <header className="page-header">
            {isMobile ? (
              /* ── 手机端精简头部 ── */
              <div className="mobile-page-header">
                <div className="mobile-page-header-left">
                  <h1 className="mobile-category-title">{category}</h1>
                  <span className="mobile-task-count">{listCount} 项</span>
                  {filterMode && (
                    <button className="filter-clear-btn" onClick={() => setFilterMode(null)}>
                      清除 <FiX />
                    </button>
                  )}
                </div>
                <div className="mobile-page-header-right">
                  <button
                    className={`icon-btn ${showMobileSearch ? 'active' : ''}`}
                    onClick={() => { setShowMobileSearch((p) => !p); setShowMobileAdd(false); }}
                    aria-label="搜索"
                  >
                    <FiSearch />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => setShowInsight((p) => !p)}
                    aria-label="数据面板"
                  >
                    <FiBarChart2 />
                  </button>
                </div>
              </div>
            ) : (
              /* ── 桌面端头部（不变）── */
              <>
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
                    <button
                      className={`inline-stat ${filterMode === 'active' ? 'filter-active' : ''}`}
                      onClick={() => setFilterMode(filterMode === 'active' ? null : 'active')}
                      title="只看未完成"
                    >
                      <strong>{listCount}</strong>
                      <span>{isTodayView ? "今日" : "当前"}</span>
                    </button>
                    <button
                      className={`inline-stat ${filterMode === 'completed' ? 'filter-active' : ''}`}
                      onClick={() => setFilterMode(filterMode === 'completed' ? null : 'completed')}
                      title="只看已完成"
                    >
                      <strong>{categoryDone}</strong>
                      <span>已完成</span>
                    </button>
                  </div>
                  {filterMode && (
                    <button className="filter-clear-btn" onClick={() => setFilterMode(null)}>
                      清除筛选 <FiX />
                    </button>
                  )}
                </div>
              </>
            )}

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
                title="命令面板 Ctrl+K"
              >
                <GridMenuIcon />
                <span className="grid-menu-kbd">CtrlK</span>
              </button>
            </div>
          </header>

          {(!isMobile || showMobileSearch) && (
            <div className={`search-bar ${isMobile ? 'search-bar-mobile' : ''}`}>
              <FiSearch />
              <input
                type="search"
                placeholder="搜索任务标题或备注…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus={isMobile && showMobileSearch}
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
              {isMobile && (
                <button
                  className="search-clear"
                  onClick={() => { setShowMobileSearch(false); setSearchQuery(""); }}
                  aria-label="关闭搜索"
                >
                  <FiX />
                </button>
              )}
            </div>
          )}

          {!isSearching && (
            <motion.div layout className={`composer ${isMobile ? 'composer-mobile' : ''}`}>
              <input
                ref={inputRef}
                type="text"
                placeholder={isMobile ? "添加任务…" : (
                  isTodayView
                    ? "添加今日任务（保存至 Personal · 截止今天）…"
                    : `在 ${category} 中添加任务…`
                )}
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
                {!isMobile && "添加"}
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
                <div className="panel-header-actions">
                  {!isSearching && listCount > 0 && (
                    <button
                      className="expand-all-btn"
                      onClick={() => {
                        if (isAllExpanded) collapseAllTasks();
                        else expandAllTasks();
                      }}
                      title={isAllExpanded ? "收起全部备注" : "展开全部备注"}
                    >
                      {isAllExpanded ? "收起全部" : "展开全部"}
                      {isAllExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  )}
                  <span className="panel-badge">
                    {isSearching
                      ? `${displayList.length} 条匹配`
                      : `${listCount} 项`}
                  </span>
                </div>
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
                          isMobile={isMobile}
                          editing={editingId === task.id}
                          editInputRef={editInputRef}
                          expanded={expandedIds.has(task.id)}
                          fullExpand={fullExpandId === task.id}
                            onToggleExpand={(id, ff) => toggleExpand(id, ff)}
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
                            onTogglePin={(id) => togglePin(id, cat)}
                            onToggleFavorite={(id) => toggleFavorite(id, cat)}
                            onStartEdit={(id) => startEdit(id)}
                            onSaveEdit={(id, text) => saveEdit(id, text, cat)}
                            onCancelEdit={cancelEdit}
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
                          isMobile={isMobile}
                          editing={editingId === task.id}
                          editInputRef={editInputRef}
                          expanded={expandedIds.has(task.id)}
                          onToggleExpand={(id) => toggleExpand(id)}
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
                          onTogglePin={(id) => togglePin(id, category)}
                          onToggleFavorite={(id) => toggleFavorite(id, category)}
                          onStartEdit={(id) => startEdit(id)}
                          onSaveEdit={(id, text) => saveEdit(id, text, category)}
                          onCancelEdit={cancelEdit}
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

            <aside className={`insight-column ${isMobile && !showInsight ? 'insight-hidden' : ''}`}>
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

              <div className="panel insight-card">
                <div className="panel-header">
                  <h3>最近活动</h3>
                </div>
                <div className="panel-body">
                  <p className="activity-summary">
                    已完成 <strong>{completedCount}</strong> 项
                    {totalCount > 0 && (
                      <span>（共 {totalCount} 项）</span>
                    )}
                  </p>

                  {recentlyCompleted.length > 0 && (
                    <div className="deleted-section">
                      <p className="deleted-title">最近已完成</p>
                      <ul className="deleted-list">
                        {recentlyCompleted.map((t) => (
                          <li key={t.id} className="completed-item">
                            <span className="check done-mini" />
                            <span className="deleted-text">{t.text}</span>
                            <span className="completed-cat">{t.category}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {deletedHistory.length > 0 && (
                    <div className="deleted-section">
                      <p className="deleted-title">
                        最近删除 · {deletedHistory.length} 条
                      </p>
                      <ul className="deleted-list">
                        {deletedHistory.slice(0, 5).map((h) => (
                          <li key={`${h.task.id}-${h.deletedAt}`} className="deleted-item">
                            <span className="deleted-text">{h.task.text}</span>
                            <button
                              className="deleted-restore-btn"
                              onClick={() => restoreFromHistory(h)}
                              title="恢复任务"
                            >
                              <FiRotateCcw />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {completedCount === 0 && deletedHistory.length === 0 && (
                    <p className="activity-empty">暂无活动记录</p>
                  )}
                </div>
              </div>

              {isMobile && (
                <div className="panel insight-card mobile-io-card">
                  <div className="panel-body" style={{ padding: '12px 18px' }}>
                    <div className="mobile-io-btns">
                      <button className="mobile-io-btn" onClick={exportData}>
                        导出数据备份
                      </button>
                      <button className="mobile-io-btn" onClick={importData}>
                        导入数据恢复
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            key={toast.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <FiClock />
            <span className="toast-msg">{toast.message}</span>
            {toast.undo && (
              <button
                className="toast-undo-btn"
                onClick={toast.undo.action}
              >
                <FiRotateCcw />
                {toast.undo.label}
              </button>
            )}
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
                <input
                  placeholder="搜索或跳转工作区…"
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setCommandOpen(false);
                    } else if (
                      e.key === "Enter" &&
                      filteredCommands.length > 0
                    ) {
                      switchCategory(filteredCommands[0].cat);
                      setCommandOpen(false);
                    }
                  }}
                />
              </div>
              <div className="command-items">
                {filteredCommands.length === 0 ? (
                  <div className="command-empty">未找到匹配的工作区</div>
                ) : (
                  filteredCommands.map((item, idx) => (
                    <button
                      key={item.cat}
                      onClick={() => {
                        switchCategory(item.cat);
                        setCommandOpen(false);
                      }}
                      className={idx === 0 ? "command-first" : ""}
                    >
                      {item.label}
                      <span>{idx === 0 ? "↵" : ""}</span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="bottom-nav" aria-label="工作区导航">
        {CATEGORIES.map((item) => {
          const Icon = CATEGORY_META[item].icon;
          const isActive = !isTodayView && category === item;

          return (
            <button
              key={item}
              type="button"
              className={`bottom-nav-item ${isActive ? "active" : ""} ${
                dropCategory === item && dragging ? "drop-hover" : ""
              }`}
              onClick={() => switchCategory(item)}
              onDragOver={(e) => handleNavDragOver(e, item)}
              onDragLeave={() => setDropCategory(null)}
              onDrop={(e) => handleNavDrop(e, item)}
              aria-label={item}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="bottom-nav-icon">
                <Icon />
              </span>
              <span className="bottom-nav-label">{item}</span>
              {todos[item].length > 0 && (
                <span className="bottom-nav-badge">
                  {todos[item].length > 99 ? "99+" : todos[item].length}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
