import ReactMarkdown from "react-markdown";

export function Markdown({ content, className = "prose-store" }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => {
            const safe = href && (href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:"));
            return (
              <a
                href={safe ? href : undefined}
                target={href?.startsWith("https://") ? "_blank" : undefined}
                rel={href?.startsWith("https://") ? "noopener noreferrer nofollow" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ alt }) => <span className="text-zinc-500">[{alt ?? "imagem"}]</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
