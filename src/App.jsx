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
} from "react-icons/fi";

import "./App.css";

const CATEGORIES = ["Personal", "Work", "Ideas", "Focus"];

const CATEGORY_META = {
  Personal: { icon: FiUser, desc: "个人生活与日常事务" },
  Work: { icon: FiBriefcase, desc: "职业项目与协作任务" },
  Ideas: { icon: FiZap, desc: "灵感草稿与创意备忘" },
  Focus: { icon: FiTarget, desc: "深度专注与单一目标" },
};

const defaultData = {
  Personal: [],
  Work: [],
  Ideas: [],
  Focus: [],
};

const PRIORITIES = ["high", "medium", "low"];

const PRIORITY_LABELS = {
  high: "高",
  medium: "中",
  low: "低",
};

function loadTodos() {
  const saved = localStorage.getItem("deepTodoData");
  if (!saved) return defaultData;

  try {
    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      return { ...defaultData, Personal: parsed };
    }

    const merged = { ...defaultData, ...parsed };

    for (const key of CATEGORIES) {
      merged[key] = (merged[key] || []).map((task) => ({
        ...task,
        priority: PRIORITIES.includes(task.priority) ? task.priority : "medium",
      }));
    }

    return merged;
  } catch {
    return defaultData;
  }
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("deepTodoTheme") || "dark";
  });
  const [category, setCategory] = useState(() => {
    const saved = localStorage.getItem("deepTodoCategory");
    return CATEGORIES.includes(saved) ? saved : "Personal";
  });
  const [input, setInput] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);

  const [todos, setTodos] = useState(loadTodos);

  const [seconds, setSeconds] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);

  const inputRef = useRef();

  const currentTodos = todos[category];
  const categoryMeta = CATEGORY_META[category];
  const CategoryIcon = categoryMeta.icon;

  const categoryDone = useMemo(
    () => currentTodos.filter((t) => t.completed).length,
    [currentTodos]
  );

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
    let interval;

    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 1500;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerRunning]);

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

  const addTask = () => {
    if (!input.trim()) return;

    const newTask = {
      id: Date.now(),
      text: input,
      completed: false,
      priority: "medium",
    };

    setTodos({
      ...todos,
      [category]: [...todos[category], newTask],
    });

    setInput("");
    inputRef.current.focus();
  };

  const deleteTask = (id) => {
    setTodos({
      ...todos,
      [category]: todos[category].filter((task) => task.id !== id),
    });
  };

  const toggleComplete = (id) => {
    setTodos({
      ...todos,
      [category]: todos[category].map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      ),
    });
  };

  const cyclePriority = (id) => {
    setTodos({
      ...todos,
      [category]: todos[category].map((task) => {
        if (task.id !== id) return task;

        const currentIndex = PRIORITIES.indexOf(task.priority || "medium");
        const nextPriority =
          PRIORITIES[(currentIndex + 1) % PRIORITIES.length];

        return { ...task, priority: nextPriority };
      }),
    });
  };

  const switchCategory = (item) => {
    setCategory(item);
    setInput("");
  };

  const completedCount = useMemo(() => {
    return Object.values(todos)
      .flat()
      .filter((task) => task.completed).length;
  }, [todos]);

  const totalCount = useMemo(() => {
    return Object.values(todos).flat().length;
  }, [todos]);

  const progress =
    totalCount === 0
      ? 0
      : Math.round((completedCount / totalCount) * 100);

  const formatTime = () => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");

    return `${mins}:${secs}`;
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
              return (
                <motion.button
                  key={item}
                  whileTap={{ scale: 0.98 }}
                  className={category === item ? "active" : ""}
                  onClick={() => switchCategory(item)}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item}</span>
                  <span className="nav-count">{todos[item].length}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <p>为深度专注而设计 · ⌘K 打开命令面板</p>
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
                title={theme === "dark" ? "白天模式" : "黑夜模式"}
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

          <div className="workspace-grid">
            <section className="panel tasks-panel">
              <div className="panel-header">
                <h3>
                  <CategoryIcon />
                  任务列表
                </h3>
                <span className="panel-badge">
                  {currentTodos.length} 项
                </span>
              </div>

              <div className="panel-body">
                {currentTodos.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FiInbox />
                    </div>
                    <h4>暂无任务</h4>
                    <p>
                      在上方输入框添加你的第一个 {category} 任务
                    </p>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={currentTodos}
                    onReorder={(newOrder) => {
                      setTodos({
                        ...todos,
                        [category]: newOrder,
                      });
                    }}
                    className="task-list"
                  >
                    <AnimatePresence>
                      {currentTodos.map((task) => (
                        <Reorder.Item
                          key={task.id}
                          value={task}
                          whileDrag={{ scale: 1.01, boxShadow: "var(--shadow-md)" }}
                          className="task-card"
                        >
                          <div
                            className={`check ${
                              task.completed ? "checked" : ""
                            }`}
                            onClick={() => toggleComplete(task.id)}
                            role="checkbox"
                            aria-checked={task.completed}
                          />

                          <button
                            type="button"
                            className={`priority-tag ${task.priority || "medium"}`}
                            onClick={() => cyclePriority(task.id)}
                            title="点击切换优先级"
                          >
                            {PRIORITY_LABELS[task.priority || "medium"]}
                          </button>

                          <span
                            className={`task-text ${
                              task.completed ? "completed" : ""
                            }`}
                          >
                            {task.text}
                          </span>

                          <button
                            className="delete-btn"
                            onClick={() => deleteTask(task.id)}
                            aria-label="删除任务"
                          >
                            <FiTrash2 />
                          </button>
                        </Reorder.Item>
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
                  <div className="timer-display">{formatTime()}</div>
                  <div className="timer-buttons">
                    <button
                      onClick={() =>
                        setTimerRunning(!timerRunning)
                      }
                    >
                      {timerRunning ? "暂停" : "开始"}
                    </button>
                    <button
                      onClick={() => {
                        setTimerRunning(false);
                        setSeconds(1500);
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

              <div className="panel insight-card">
                <div className="panel-header">
                  <h3>智能建议</h3>
                </div>
                <div className="panel-body">
                  <div className="ai-box">
                    <FiSearch />
                    <p>
                      将大任务拆分为可执行的小步骤，每次专注完成一项，效率会显著提升。
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

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
              transition={{ duration: 0.18 }}
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
