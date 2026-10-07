// Article body rendering and attachment cards.
// Extracted from App.jsx.
import { contentHasAttachment, slugifyHeading } from "../lib/content";

export function renderArticleContent(content = "", attachments, copy) {
  const rendered = [];
  const lines = content.split("\n");

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const attachmentToken = line.match(/^\[\[attachment:([a-zA-Z0-9-]+)\]\]$/);
    if (attachmentToken) {
      const attachment = attachments.find((item) => item.id === attachmentToken[1]);
      if (attachment) {
        rendered.push({
          type: "attachment",
          key: `attachment-${attachment.id}-${index}`,
          value: attachment,
        });
      }
      return;
    }

    if (/^###\s+/.test(line) || /^##\s+/.test(line)) {
      const level = line.startsWith("###") ? 3 : 2;
      const title = line.replace(/^(##|###)\s+/, "").trim();
      rendered.push({
        type: "heading",
        key: `heading-${index}`,
        value: title,
        level,
        id: slugifyHeading(`${title}-${index}`),
      });
      return;
    }

    rendered.push({
      type: "text",
      key: `text-${index}`,
      value: line,
      id: `paragraph-${index}`,
    });
  });

  const remainingAttachments = attachments.filter(
    (attachment) => !contentHasAttachment(content, attachment.id)
  );

  return { rendered, remainingAttachments };
}

export function AttachmentBlock({
  attachment,
  copy,
  compact = false,
  onRemove = null,
  onInsert = null,
  inserted = false,
}) {
  return (
    <div className={`attachment-card ${compact ? "compact" : ""}`}>
      <div className="attachment-card__preview">
        {attachment.kind === "image" ? (
          <img src={attachment.dataUrl} alt={attachment.name} />
        ) : attachment.kind === "audio" ? (
          <audio controls src={attachment.dataUrl} preload="metadata" />
        ) : attachment.kind === "video" ? (
          <video controls src={attachment.dataUrl} />
        ) : (
          <div className="attachment-card__file">
            <span>{copy.mediaFile}</span>
            <strong>{attachment.name}</strong>
          </div>
        )}
      </div>
      <div className="attachment-card__meta">
        <strong>{attachment.name}</strong>
        <span>{copy[`media${attachment.kind[0].toUpperCase()}${attachment.kind.slice(1)}`] || copy.mediaFile}</span>
      </div>
      <div className="attachment-card__actions">
        <a className="dock-button" href={attachment.dataUrl} download={attachment.name}>
          {copy.preview}
        </a>
        {onInsert ? (
          <button type="button" className="dock-button" onClick={() => onInsert(attachment.id)}>
            {inserted ? copy.insertedAttachment : copy.insertAttachment}
          </button>
        ) : null}
        {onRemove ? (
          <button type="button" className="dock-button" onClick={() => onRemove(attachment.id)}>
            {copy.remove}
          </button>
        ) : null}
      </div>
    </div>
  );
}
