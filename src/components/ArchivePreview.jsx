import { Link } from "react-router-dom";

import Reveal from "./Reveal";

// 档案预览：在首页提取最近年份切片，作为完整时间档案的入口。
export default function ArchivePreview({ language, groups, experience }) {
  const previewYears = Object.entries(groups).slice(0, 2);

  return (
    <section className="section archive-preview-section">
      <div className="section-head">
        <div>
          <p className="micro-label">{experience.archiveTitle}</p>
          <h2>{experience.archiveTitle}</h2>
        </div>
        <Link className="action-button action-button--secondary" to="/archive">
          {experience.archiveOpen}
        </Link>
      </div>
      <div className="archive-preview-grid">
        {previewYears.map(([year, items], index) => (
          <Reveal key={year} delay={index * 90}>
            <article className="archive-year-card glass-card">
              <strong>{year}</strong>
              <div className="archive-year-card__list">
                {items.slice(0, 3).map((item) =>
                  item.type === "article" ? (
                    <Link key={item.id} to={`/articles/${item.slug}`} className="archive-link">
                      <span>{item.title[language] || item.title.en}</span>
                      <em>{experience.timelineArticles}</em>
                    </Link>
                  ) : (
                    <Link key={item.id} to={`/projects/${item.slug}`} className="archive-link">
                      <span>{item.title[language] || item.title.en}</span>
                      <em>{experience.timelineProjects}</em>
                    </Link>
                  )
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
