import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  children: string;
  className?: string;
  allowRawHtml?: boolean; // For search highlighting
}

export function MarkdownRenderer({
  children,
  className,
  allowRawHtml = false,
}: MarkdownRendererProps) {
  // If raw HTML is allowed (for search highlighting), use rehypeRaw
  const rehypePlugins = allowRawHtml
    ? [rehypeHighlight, rehypeRaw]
    : [rehypeHighlight];

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={{
          // Customize link styling for flashcards
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Customize code blocks for better visibility
          code: ({ node: _node, className, children, ...props }) => {
            const isInline = !className?.includes("language-");
            return (
              <code
                {...props}
                className={
                  isInline
                    ? "rounded bg-gray-100 px-1 py-0.5 font-mono text-sm"
                    : "block overflow-x-auto rounded bg-gray-100 p-2 font-mono text-sm"
                }
              >
                {children}
              </code>
            );
          },
          // Customize blockquotes for flashcards
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-gray-300 pl-4 text-gray-700 italic"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
