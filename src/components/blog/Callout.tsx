/** A highlighted aside in a post: <Callout>…</Callout> in MDX */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-6 rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 [&>p]:m-0">{children}</aside>
  );
}
