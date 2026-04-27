import { useEffect, useMemo, useRef, useState } from "react";

// 命令面板：站内控制中心，负责搜索、分组、键盘导航，以及展示当前全站状态。
export default function CommandPalette({ open, onClose, actions, experience, statusItems = [] }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return actions.filter((item) => {
      if (!lowered) {
        return true;
      }
      return [item.label, item.group, item.keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(lowered);
    });
  }, [actions, query]);

  const grouped = useMemo(
    () =>
      filtered.reduce((groups, item) => {
        if (!groups[item.group]) {
          groups[item.group] = [];
        }
        groups[item.group].push(item);
        return groups;
      }, {}),
    [filtered]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const activeNode = document.querySelector(".command-palette__item.active");
    activeNode?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!filtered.length) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filtered.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        filtered[activeIndex]?.run?.();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, filtered, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="command-palette" role="dialog" aria-modal="true">
      <button type="button" className="command-palette__backdrop" onClick={onClose} aria-label="Close command palette" />
      <div className="command-palette__panel glass-card">
        {statusItems.length ? (
          <div className="command-palette__status">
            {statusItems.map((item) => (
              <div key={item.label} className="command-palette__status-item">
                <span className="micro-label">{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        <input
          ref={inputRef}
          className="command-palette__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={experience.commandPlaceholder}
        />
        <div className="command-palette__list">
          {filtered.length ? (
            Object.entries(grouped).map(([group, items]) => (
              <section key={group} className="command-palette__group">
                <p className="micro-label command-palette__group-title">{group}</p>
                <div className="command-palette__group-list">
                  {items.map((item) => {
                    const itemIndex = filtered.findIndex((entry) => entry.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`command-palette__item ${itemIndex === activeIndex ? "active" : ""}`}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => {
                          item.run();
                          onClose();
                        }}
                      >
                        <span className="micro-label">{item.group}</span>
                        <strong>{item.label}</strong>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <p className="body-copy command-palette__empty">{experience.commandEmpty}</p>
          )}
        </div>
      </div>
    </div>
  );
}
