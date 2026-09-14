export function MarkingBar({ items }: { items: string[] }) {
  return (
    <div className="marking" role="note" aria-label="Handling marking">
      {items.map((item, i) => (
        <span key={item} style={{ opacity: 1, margin: 0 }}>
          {i > 0 && <span>//</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
