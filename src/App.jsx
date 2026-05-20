import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";

import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiMoon,
  FiSun,
  FiCommand,
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
  PRIORITY_LABELS,
  EMPTY_GUIDES,
  loadTodos,
  normalizeTask,
  todayString,
  getDueStatus,
  formatDueLabel,
  getTodayStats,
  getMotivation,
  playPomodoroSound,
  notifyPomodoroDone,
} from "./utils/tasks";

import "./App.css";

const CATEGORY_META = {
  Personal: { icon: FiUser, desc: "个人生活与日常事务" },
  Work: { icon: FiBriefcase, desc: "职业项目与协作任务" },
  Ideas: { icon: FiZap, desc: "灵感草稿与创意备忘" },
  Focus: { icon: FiTarget, desc: "深度专注与单一目标" },
};

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
              placeholder="添加备注、链接或详细说明…"
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
    return CATEGORIES.includes(saved) ? saved : "Personal";
  });
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropCategory, setDropCategory] = useState(null);
  const [toast, setToast] = useState(null);

  const [todos, setTodos] = useState(loadTodos);
  const [seconds, setSeconds] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);

  const inputRef = useRef();
  const pomodoroFiredRef = useRef(false);

  const currentTodos = todos[category];
  const categoryMeta = CATEGORY_META[category];
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
    : currentTodos.map((t) => ({ task: t, category }));

  const categoryDone = useMemo(
    () => currentTodos.filter((t) => t.completed).length,
    [currentTodos]
  );

  const todayStats = useMemo(() => getTodayStats(todos), [todos]);
  const motivation = useMemo(() => getMotivation(todayStats), [todayStats]);

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
    setToast("番茄钟时间到，休息一下吧");
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

    const newTask = normalizeTask({
      id: Date.now(),
      text: input,
      completed: false,
      priority: "medium",
      dueDate: null,
      notes: "",
    });

    updateCategory(category, (list) => [...list, newTask]);
    setInput("");
    inputRef.current?.focus();
  };

  const deleteTask = (id, cat = category) => {
    updateCategory(cat, (list) => list.filter((t) => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleComplete = (id, cat = category) => {
    updateCategory(cat, (list) =>
      list.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const cyclePriority = (id, cat = category) => {
    const PRIORITIES = ["high", "medium", "low"];
    updateCategory(cat, (list) =>
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

  const updateDueDate = (id, dueDate, cat = category) => {
    updateCategory(cat, (list) =>
      list.map((t) => (t.id === id ? { ...t, dueDate } : t))
    );
  };

  const updateNotes = (id, notes, cat = category) => {
    updateCategory(cat, (list) =>
      list.map((t) => (t.id === id ? { ...t, notes } : t))
    );
  };

  const switchCategory = (item) => {
    setCategory(item);
    setInput("");
    setExpandedId(null);
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
    if (isSearching) return;
    setTodos((prev) => ({ ...prev, [category]: newOrder }));
  };

  return (
    <div className={`app ${theme}`}>
      <div className="background-glow" aria-hidden="true" />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-mark">D</div>
          <div className="logo-text">
            <span className="logo-title">DeepTodo</span>
            <span className="logo-sub">Workspace</span>
          </div>
        </div>

        <div className="sidebar-section">
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
        <div className="main-scroll">
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
              <div className="stat-pill">
                <strong>{currentTodos.length}</strong>
                <span>当前</span>
              </div>
              <div className="stat-pill">
                <strong>{categoryDone}</strong>
                <span>已完成</span>
              </div>
              <div className="stat-pill">
                <strong>{progress}%</strong>
                <span>总进度</span>
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
                className="command-btn"
                onClick={() => setCommandOpen(true)}
              >
                <FiCommand />
                命令
                <span className="command-kbd">⌘K</span>
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
                placeholder={`在 ${category} 中添加任务…`}
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
                    : `${currentTodos.length} 项`}
                </span>
              </div>

              <div className="panel-body">
                {!isSearching && currentTodos.length === 0 ? (
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
                ) : isSearching ? (
                  <ul className="task-list search-results">
                    <AnimatePresence>
                      {displayList.map(({ task, category: cat }) => (
                        <TaskRow
                          key={`${cat}-${task.id}`}
                          task={task}
                          taskCategory={cat}
                          showCategoryBadge
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
                    values={currentTodos}
                    onReorder={reorderCurrent}
                    className="task-list"
                  >
                    <AnimatePresence>
                      {currentTodos.map((task) => (
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
                          onToggleComplete={toggleComplete}
                          onCyclePriority={cyclePriority}
                          onUpdateDueDate={updateDueDate}
                          onUpdateNotes={updateNotes}
                          onDelete={deleteTask}
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
                  <h3>今日洞察</h3>
                  <span className="panel-badge">{todayString()}</span>
                </div>
                <div className="panel-body">
                  <div className="today-stats">
                    <div className="today-stat">
                      <strong>{todayStats.dueToday}</strong>
                      <span>今日到期</span>
                    </div>
                    <div className="today-stat">
                      <strong>{todayStats.completedToday}</strong>
                      <span>已完成</span>
                    </div>
                    <div className="today-stat">
                      <strong>{todayStats.pendingToday}</strong>
                      <span>待处理</span>
                    </div>
                    <div className="today-stat">
                      <strong>{todayStats.overdue}</strong>
                      <span>已逾期</span>
                    </div>
                  </div>
                  <p className="motivation-text">{motivation}</p>
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
