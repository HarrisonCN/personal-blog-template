// 首页布局切换器：在同一份内容上快速切换不同信息编排方式。
export default function HomeLayoutSwitcher({ experience, layout, setLayout, options }) {
  return (
    <div className="layout-switcher glass-card">
      <span className="micro-label">{experience.layoutTitle}</span>
      <div className="layout-switcher__row">
        {options.map((option) => {
          const labelKey =
            option.code === "archive" ? "layoutArchive" : option.code === "cards" ? "layoutCards" : "layoutMagazine";
          return (
            <button
              key={option.code}
              type="button"
              className={`layout-switcher__button ${layout === option.code ? "active" : ""}`}
              onClick={() => setLayout(option.code)}
            >
              <span>{option.icon}</span>
              <strong>{experience[labelKey]}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
