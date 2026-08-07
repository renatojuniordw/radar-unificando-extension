function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

export default Section;
