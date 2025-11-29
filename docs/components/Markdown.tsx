"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface MarkdownProps {
  children: string;
  className?: string;
}

const CodeBlock = ({
  language,
  children,
}: {
  language?: string;
  children: string;
}) => {
  const [copied, setCopied] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-1.5">
      {language && (
        <div className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted/80 rounded-tl-md rounded-br-md font-mono">
          {language}
        </div>
      )}
      <SyntaxHighlighter
        language={language || "text"}
        style={isDark ? vscDarkPlus : oneLight}
        wrapLongLines
        customStyle={{
          margin: 0,
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          background: isDark ? "#1e1e1e" : "#fafafa",
          paddingTop: language ? "1.5rem" : "0.5rem",
          paddingBottom: "0.5rem",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
        }}
      >
        {children}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          isDark
            ? "bg-zinc-700 hover:bg-zinc-600"
            : "bg-zinc-200 hover:bg-zinc-300"
        )}
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy
            className={cn(
              "h-3 w-3",
              isDark ? "text-zinc-300" : "text-zinc-600"
            )}
          />
        )}
      </button>
    </div>
  );
};

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted px-1 py-0.5 rounded text-[12px] font-mono text-violet-600 dark:text-violet-400">
    {children}
  </code>
);

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn("text-[13px] text-foreground/90 leading-snug", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1];
            const codeContent = String(children).replace(/\n$/, "");

            if (inline) {
              return <InlineCode>{children}</InlineCode>;
            }

            return <CodeBlock language={language}>{codeContent}</CodeBlock>;
          },
          a({ children, ...props }: any) {
            return (
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 dark:text-violet-400 hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          img({ ...props }: any) {
            return (
              <img
                className="max-w-full h-auto rounded my-2"
                alt={props.alt || "image"}
                {...props}
              />
            );
          },
          table({ children, ...props }: any) {
            return (
              <div className="my-2 overflow-x-auto rounded border border-border">
                <table
                  className="min-w-full divide-y divide-border text-[12px]"
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead({ children, ...props }: any) {
            return (
              <thead className="bg-muted/50" {...props}>
                {children}
              </thead>
            );
          },
          th({ children, ...props }: any) {
            return (
              <th
                className="px-2 py-1 text-left text-[11px] font-semibold text-foreground"
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }: any) {
            return (
              <td
                className="px-2 py-1 text-[12px] border-t border-border"
                {...props}
              >
                {children}
              </td>
            );
          },
          blockquote({ children, ...props }: any) {
            return (
              <blockquote
                className="border-l-2 border-violet-500/50 pl-2 italic my-1.5 text-muted-foreground text-[12px]"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          ul({ children, ...props }: any) {
            return (
              <ul
                className="list-disc list-outside ml-3.5 my-1 space-y-0.5"
                {...props}
              >
                {children}
              </ul>
            );
          },
          ol({ children, ...props }: any) {
            return (
              <ol
                className="list-decimal list-outside ml-3.5 my-1 space-y-0.5"
                {...props}
              >
                {children}
              </ol>
            );
          },
          li({ children, ...props }: any) {
            return (
              <li className="text-[13px] leading-snug" {...props}>
                {children}
              </li>
            );
          },
          p({ children, ...props }: any) {
            // Use div to avoid hydration errors when code blocks are inside
            return (
              <div className="my-1 leading-snug" {...props}>
                {children}
              </div>
            );
          },
          h1({ children, ...props }: any) {
            return (
              <h1
                className="text-base font-bold mt-3 mb-1.5 text-foreground"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2({ children, ...props }: any) {
            return (
              <h2
                className="text-[15px] font-bold mt-2.5 mb-1 text-foreground"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3({ children, ...props }: any) {
            return (
              <h3
                className="text-[14px] font-semibold mt-2 mb-1 text-foreground"
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4({ children, ...props }: any) {
            return (
              <h4
                className="text-[13px] font-semibold mt-1.5 mb-0.5 text-foreground"
                {...props}
              >
                {children}
              </h4>
            );
          },
          hr({ ...props }: any) {
            return <hr className="my-2 border-border" {...props} />;
          },
          strong({ children, ...props }: any) {
            return (
              <strong className="font-semibold text-foreground" {...props}>
                {children}
              </strong>
            );
          },
          em({ children, ...props }: any) {
            return (
              <em className="italic" {...props}>
                {children}
              </em>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
