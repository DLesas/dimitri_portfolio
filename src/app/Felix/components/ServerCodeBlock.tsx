/**
 * Server-side code block component
 * Renders code without client-side JavaScript
 * Uses CSS for theming based on html.dark class
 */
export function ServerCodeBlock({
  children,
  language = 'typescript'
}: {
  children: string;
  language?: string;
}) {
  return (
    <pre className="code-block-pre">
      <code className={`language-${language}`}>
        {children}
      </code>
    </pre>
  );
}
