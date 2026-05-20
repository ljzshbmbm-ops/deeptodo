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
} from "react-icons/fi";

import "./App.css";

const CATEGORIES = ["Personal", "Work", "Ideas", "Focus"];

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
      <div className="background-glow"></div>

      <aside className="sidebar">
        <div className="sidebar-top">
          <h1 className="logo">DeepTodo</h1>

          <nav className="menu">
            {CATEGORIES.map((item) => (
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ x: 6 }}
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => switchCategory(item)}
              >
                {item}
              </motion.button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <p>Built for deep focus.</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{category}</h2>
            <p>Organize your workflow beautifully.</p>
          </div>

          <div className="topbar-actions">
            <button
              className="theme-toggle-btn"
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
              Command
            </button>
          </div>
        </header>

        <motion.div layout className="input-section">
          <input
            ref={inputRef}
            type="text"
            placeholder="What needs your attention?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={addTask}
          >
            <FiPlus />
            Add
          </motion.button>
        </motion.div>

        <div className="content-grid">
          <section className="tasks-panel glass">
            <div className="panel-header">
              <h3>Tasks</h3>
              <span>{currentTodos.length} items</span>
            </div>

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
                    whileDrag={{
                      scale: 1.03,
                    }}
                    className="task-card"
                  >
                    <div
                      className={`check ${
                        task.completed ? "checked" : ""
                      }`}
                      onClick={() => toggleComplete(task.id)}
                    ></div>

                    <button
                      type="button"
                      className={`priority-tag ${task.priority || "medium"}`}
                      onClick={() => cyclePriority(task.id)}
                      title="点击切换优先级"
                    >
                      {PRIORITY_LABELS[task.priority || "medium"]}
                    </button>

                    <span
                      className={
                        task.completed ? "completed" : ""
                      }
                    >
                      {task.text}
                    </span>

                    <button
                      className="delete-btn"
                      onClick={() => deleteTask(task.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </section>

          <section className="right-column">
            <div className="glass timer-card">
              <div className="panel-header">
                <h3>
                  <FiClock />
                  Focus Timer
                </h3>
              </div>

              <div className="timer-time">
                {formatTime()}
              </div>

              <div className="timer-buttons">
                <button
                  onClick={() =>
                    setTimerRunning(!timerRunning)
                  }
                >
                  {timerRunning ? "Pause" : "Start"}
                </button>

                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setSeconds(1500);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="glass analytics-card">
              <div className="panel-header">
                <h3>
                  <FiBarChart2 />
                  Analytics
                </h3>
              </div>

              <div className="analytics-grid">
                <div>
                  <span>{totalCount}</span>
                  <p>Total</p>
                </div>

                <div>
                  <span>{completedCount}</span>
                  <p>Done</p>
                </div>

                <div>
                  <span>{progress}%</span>
                  <p>Focus</p>
                </div>
              </div>

              <div className="progress-bar">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="progress-fill"
                />
              </div>
            </div>

            <div className="glass ai-card">
              <div className="panel-header">
                <h3>AI Assistant</h3>
              </div>

              <div className="ai-box">
                <FiSearch />

                <p>
                  Try breaking large tasks into smaller
                  milestones for better focus.
                </p>
              </div>
            </div>
          </section>
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
              className="command-menu glass"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="command-search">
                <FiSearch />

                <input placeholder="Search actions..." />
              </div>

              <div className="command-items">
                <button
                  onClick={() => {
                    switchCategory("Personal");
                    setCommandOpen(false);
                  }}
                >
                  Open Personal
                </button>

                <button
                  onClick={() => {
                    switchCategory("Work");
                    setCommandOpen(false);
                  }}
                >
                  Open Work
                </button>

                <button
                  onClick={() => {
                    switchCategory("Ideas");
                    setCommandOpen(false);
                  }}
                >
                  Open Ideas
                </button>

                <button
                  onClick={() => {
                    switchCategory("Focus");
                    setCommandOpen(false);
                  }}
                >
                  Open Focus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;