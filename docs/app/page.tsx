"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "nextra-theme-docs";
import { useState, useEffect } from "react";

// Custom styled Link component that handles Nextra's CSS specificity
const StyledLink = ({
  href,
  children,
  lightColor,
  darkColor,
  className,
  ...props
}) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const color = isDark ? darkColor : lightColor;

  return (
    <Link href={href} style={{ color }} className={className} {...props}>
      {children}
    </Link>
  );
};
import {
  Users,
  Wrench,
  Brain,
  Zap,
  BarChart3,
  Settings,
  ArrowRight,
  Bot,
  GraduationCap,
  ChartColumnStacked,
  Rocket,
  PenTool,
  Code,
  Cog,
  Terminal,
  Github,
  DollarSign,
  Sparkles,
  Copy,
  Check,
  Play,
} from "lucide-react";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

// Enhanced bootstrap tabs with example code
const BootstrapTabs = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const workflows = [
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      description: "Research → Draft → Edit workflow",
      command:
        "npm install vibex\nnpx vibex init my-research --template writing",
      agents: ["Researcher", "Writer", "Reviewer", "Web Designer"],
      exampleCode: `import { startTask } from 'vibex';

async function main() {
  // Start VibeX with your research team
  const x = await startTask(
    "Write a comprehensive report on AI trends in 2025",
    "config/team.yaml"
  );
  
  // Enable parallel execution for 3-5x faster workflows
  x.setParallelExecution({ enabled: true, maxConcurrent: 4 });

  console.log(\`Task ID: \${x.taskId}\`);
  console.log(\`Workspace: \${x.workspace.getWorkspacePath()}\`);

  // Execute tasks with parallel processing
  while (!x.isComplete) {
    const response = await x.step(); // Runs multiple tasks in parallel
    console.log(\`X: \${response}\`);
  }

  // Chat with your AI team for refinements
  const response = await x.chat("Focus more on business applications");
  console.log(\`X: \${response.text}\`);

  // Continue chatting for iterations
  await x.chat("Add more visual charts and graphs");
  await x.chat("Create an executive summary");
}

main();`,
    },
    {
      id: "coding",
      title: "Coding",
      icon: Code,
      description: "Plan → Build → Test workflow",
      command: "npm install vibex\nnpx vibex init my-app --template coding",
      agents: ["Planner", "Developer", "Reviewer"],
      exampleCode: `import { startTask } from 'vibex';

async function main() {
  // Start VibeX with your development team
  const x = await startTask(
    "Build a REST API for a todo application",
    "config/team.yaml"
  );
  
  // Enable parallel execution for faster development
  x.setParallelExecution({ enabled: true, maxConcurrent: 3 });

  console.log(\`Task ID: \${x.taskId}\`);

  // Execute tasks in parallel (e.g., API design + DB schema + tests)
  while (!x.isComplete) {
    const response = await x.step();
    console.log(\`X: \${response}\`);
  }

  // Chat with your development team for changes
  const response = await x.chat("Use FastAPI and SQLite instead");
  console.log(\`X: \${response.text}\`);

  // Continue development with chat
  await x.chat("Add user authentication");
  await x.chat("Write comprehensive tests");
}

main();`,
    },
    {
      id: "ops",
      title: "Ops",
      icon: Cog,
      description: "Analyze → Execute → Monitor workflow",
      command: "npm install vibex\nnpx vibex init my-automation --template ops",
      agents: ["Analyst", "Operator", "Monitor"],
      exampleCode: `import { startTask } from 'vibex';

async function main() {
  // Start VibeX with your operations team
  const x = await startTask(
    "Automate daily server health monitoring",
    "config/team.yaml"
  );

  console.log(\`Task ID: \${x.taskId}\`);

  // Execute the initial task
  while (!x.isComplete) {
    const response = await x.step();
    console.log(\`X: \${response}\`);
  }

  // Chat with your ops team for adjustments
  const response = await x.chat("Check disk usage and memory too");
  console.log(\`X: \${response.text}\`);

  // Add monitoring with chat
  await x.chat("Set up alerts for high CPU usage");
  await x.chat("Generate a daily status report");
}

main();`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Workflow Tabs - Clean and minimal styling */}
      <div className="flex items-center justify-center gap-1 mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {workflows.map((workflow, index) => {
          const isActive = activeTab === index;

          return (
            <button
              key={workflow.id}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <workflow.icon className="w-4 h-4" />
              {workflow.title}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* CLI Command Block - Enhanced with better styling */}
          <div className="relative bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl p-6 mb-6 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            {/* Terminal decoration */}
            <div className="absolute top-3 left-4 flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/50"></div>
            </div>

            {/* Command lines */}
            <div className="font-mono text-sm mt-6">
              {workflows[activeTab].command.split("\n").map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 py-1"
                >
                  <span className="text-emerald-600 dark:text-emerald-400 select-none">
                    $
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {line}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Copy button */}
            <button
              onClick={() => handleCopy(workflows[activeTab].command)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Copy command"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              )}
            </button>
          </div>

          {/* Enhanced Code Window - Claude-inspired */}
          <div className="bg-slate-900 rounded-lg border border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Enhanced Window Header */}
            <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-sm font-medium text-slate-300">
                  index.ts
                </span>
              </div>
            </div>

            {/* Enhanced Code Content */}
            <div className="p-4 bg-slate-900">
              <SyntaxHighlighter
                language="typescript"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  fontSize: "0.8rem",
                  lineHeight: "1.6",
                  background: "transparent",
                  fontFamily:
                    "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
                }}
                showLineNumbers={true}
                lineNumberStyle={{
                  color: "#64748b",
                  paddingRight: "1rem",
                  fontSize: "0.75rem",
                }}
                className="border-none!"
                codeTagProps={{
                  style: {
                    background: "transparent",
                  },
                }}
              >
                {workflows[activeTab].exampleCode}
              </SyntaxHighlighter>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default function HomePage() {
  const features = [
    {
      icon: Sparkles,
      title: "AI SDK Compatible",
      description:
        "Works seamlessly with Vercel AI SDK and OpenAI-compatible APIs. Stream tool calls in real-time.",
      href: "/docs/integration/ai-sdk",
      badge: "NEW",
    },
    {
      icon: Zap,
      title: "Parallel Execution",
      description:
        "3-5x faster workflows with intelligent parallel task execution and dependency management.",
      href: "/docs/design/overview",
    },
    {
      icon: Users,
      title: "Multi-Agent Teams",
      description:
        "Specialized agents collaborate seamlessly with natural language handoffs.",
      href: "/docs/design/overview",
    },
    {
      icon: Brain,
      title: "Stateful Memory",
      description:
        "Long-term context retention with semantic search across conversations.",
      href: "/docs/design/state-and-context",
    },
    {
      icon: Wrench,
      title: "Extensible Tools",
      description: "Rich tool ecosystem with secure Docker sandbox execution.",
      href: "/docs/design/tool-execution",
    },
    {
      icon: BarChart3,
      title: "Full Observability",
      description:
        "Real-time monitoring, distributed tracing, and event streaming.",
      href: "#",
    },
  ];

  const useCases = [
    {
      icon: Bot,
      title: "Agentic Applications",
      description:
        "Build intelligent applications with autonomous AI agents and human oversight.",
    },
    {
      icon: GraduationCap,
      title: "Research Automation",
      description:
        "Deploy collaborative research teams for data gathering and analysis.",
    },
    {
      icon: ChartColumnStacked,
      title: "Enterprise Operations",
      description:
        "Streamline business operations through intelligent automation.",
    },
    {
      icon: Rocket,
      title: "Creative Workflows",
      description:
        "Accelerate creative processes with AI-assisted ideation and content generation.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-20 overflow-hidden">
        {/* Rich Gradient Background */}
        <div className="absolute inset-0 bg-white dark:bg-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-purple-100/40 via-transparent to-transparent dark:from-purple-900/20"></div>

          {/* Animated Grid - Rotated 45 degrees for X vision */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <svg
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="hero-x-pattern"
                  x="0"
                  y="0"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M0 0L40 40M40 0L0 40"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-900 dark:text-white"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-x-pattern)" />
            </svg>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              y: [-20, 20, -20],
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-20 right-[10%] w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"
          ></motion.div>

          <motion.div
            animate={{
              y: [20, -20, 20],
              rotate: [0, -5, 5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-20 left-[10%] w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"
          ></motion.div>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative max-w-7xl mx-auto px-4 text-center z-10"
        >
          <div className="max-w-5xl mx-auto">
            {/* Main heading */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight"
            >
              Evolve with Dedicated <br />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 via-purple-600 to-blue-600 dark:from-blue-400 dark:via-purple-400 dark:to-blue-400 animate-gradient bg-300%">
                Agentic Teams
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Orchestrate multi-agent AI workflows with intelligent parallel
              execution and human-in-the-loop control.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/docs/getting-started"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:shadow-lg hover:shadow-blue-500/30 no-underline overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                <span className="text-white">Quick Start</span>
                <ArrowRight className="text-white w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>

              <StyledLink
                href="/docs/design/vibe-x"
                lightColor="#374151"
                darkColor="#d1d5db"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium transition-all duration-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                <Play className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" />
                Watch Demo
              </StyledLink>
            </motion.div>

            {/* Tech Stack / Trusted By (Optional placeholder) */}
            <motion.div
              variants={itemVariants}
              className="mt-16 pt-8 border-t border-slate-200/60 dark:border-slate-800/60"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-500 mb-6">
                POWERED BY MODERN AI STACK
              </p>
              <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Simple text placeholders for logos to avoid image dependencies */}
                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  OpenAI
                </span>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Anthropic
                </span>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Vercel AI SDK
                </span>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  LangChain
                </span>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Supabase
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Vibe-X Philosophy */}
      <section className="relative py-32 bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>

          {/* Subtle grid pattern */}
          {/* Subtle grid pattern - X Vision */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <svg
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="philosophy-x-pattern"
                  x="0"
                  y="0"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M0 0L40 40M40 0L0 40"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-900 dark:text-white"
                  />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#philosophy-x-pattern)"
              />
            </svg>
          </div>

          {/* Glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="mb-20 text-center"
          >
            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white mb-6"
            >
              The Vibe-X Philosophy
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
            >
              We believe in a future where AI agents and humans work together in
              perfect harmony, combining computational power with human
              intuition.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-12 gap-6">
            {/* Card 1: Transparent Processes - Large Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="md:col-span-8 relative group overflow-hidden rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl"
            >
              <div className="absolute inset-0 bg-linear-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative p-10 h-full flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-left">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                    <Brain className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Transparent Intelligence
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    No more black boxes. Watch your agents think, plan, and
                    execute in real-time. Inspect their reasoning steps,
                    intervene when necessary, and guide them toward success.
                  </p>
                </div>

                {/* Visual representation */}
                <div className="w-full md:w-1/2 aspect-video bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 relative overflow-hidden">
                  <div className="absolute top-4 left-4 right-4 space-y-3">
                    <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
                    <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse delay-75"></div>
                    <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse delay-150"></div>
                  </div>

                  {/* Floating code snippet */}
                  <div className="absolute bottom-4 right-4 bg-slate-900 dark:bg-black rounded-lg p-3 shadow-lg border border-slate-700 transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <div className="flex gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-20 bg-slate-700 rounded-full"></div>
                      <div className="h-1.5 w-16 bg-slate-700 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Human in the Loop - Tall Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-4 relative group overflow-hidden rounded-3xl bg-slate-900 dark:bg-black border border-slate-800 dark:border-slate-800 shadow-xl text-white"
            >
              <div className="absolute inset-0 bg-linear-to-b from-purple-500/20 to-transparent opacity-50"></div>

              <div className="relative p-8 h-full flex flex-col">
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 text-purple-400 border border-purple-500/30">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Human Synergy</h3>
                <p className="text-slate-300 leading-relaxed mb-8">
                  AI shouldn't replace humans—it should amplify them. Define
                  boundaries, approve critical decisions, and maintain full
                  control.
                </p>

                <div className="mt-auto relative h-32">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/30 blur-3xl rounded-full"></div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                    <div className="bg-slate-800/80 backdrop-blur-md rounded-full px-6 py-2 border border-slate-700 flex items-center gap-3 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        Awaiting Approval
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Cost-Aware - Medium Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-5 relative group overflow-hidden rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl"
            >
              <div className="absolute inset-0 bg-linear-to-br from-green-50/50 to-transparent dark:from-green-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative p-8">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                  <DollarSign className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  Smart Economics
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Intelligent routing automatically selects the most
                  cost-effective model for each task. Save up to 60% on token
                  costs without sacrificing quality.
                </p>
              </div>
            </motion.div>

            {/* Card 4: Production Ready - Medium Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="md:col-span-7 relative group overflow-hidden rounded-3xl bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 dark:bg-slate-700/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/50 rounded-2xl flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400">
                    <Rocket className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    Production First
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Built for the real world. Type-safe, observable, and
                    scalable from day one.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-600 dark:text-slate-400">
                    99.9% Uptime
                  </div>
                  <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-600 dark:text-slate-400">
                    &lt;50ms Latency
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bootstrap Section */}
      <section className="relative py-24 bg-slate-50 dark:bg-slate-800/30 overflow-hidden">
        {/* Subtle background pattern */}
        {/* Subtle background pattern - X Vision */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="bootstrap-x-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 0L40 40M40 0L0 40"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-slate-900 dark:text-white"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bootstrap-x-pattern)" />
          </svg>
        </div>

        {/* Floating decoration */}
        <motion.div
          animate={{ y: [-20, 20, -20], rotate: [0, 180, 360] }}
          transition={{
            duration: 40,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          className="absolute top-20 right-10 w-24 h-24 bg-blue-200 dark:bg-blue-900/30 rounded-full blur-2xl opacity-40"
        ></motion.div>

        <div className="relative max-w-7xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="text-center mb-12"
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4"
            >
              Get Started in{" "}
              <span className="text-blue-600 dark:text-blue-400">Seconds</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: "easeOut" },
              },
            }}
          >
            <BootstrapTabs />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 bg-white dark:bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Production-ready capabilities for sophisticated multi-agent
              architectures. Built to scale with your needs.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => {
              const gradients = [
                "from-blue-500/10 to-indigo-500/10",
                "from-purple-500/10 to-pink-500/10",
                "from-emerald-500/10 to-teal-500/10",
                "from-orange-500/10 to-red-500/10",
                "from-violet-500/10 to-purple-500/10",
                "from-cyan-500/10 to-blue-500/10",
              ];
              const borderColors = [
                "group-hover:border-blue-500/50",
                "group-hover:border-purple-500/50",
                "group-hover:border-emerald-500/50",
                "group-hover:border-orange-500/50",
                "group-hover:border-violet-500/50",
                "group-hover:border-cyan-500/50",
              ];
              const iconColors = [
                "text-blue-600 dark:text-blue-400",
                "text-purple-600 dark:text-purple-400",
                "text-emerald-600 dark:text-emerald-400",
                "text-orange-600 dark:text-orange-400",
                "text-violet-600 dark:text-violet-400",
                "text-cyan-600 dark:text-cyan-400",
              ];

              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  className="group relative h-full"
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${gradients[index]} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>

                  <div
                    className={`relative h-full bg-white dark:bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-200 dark:border-slate-700 ${borderColors[index]} transition-colors duration-300 flex flex-col overflow-hidden`}
                  >
                    <StyledLink
                      href={feature.href}
                      lightColor="#1e293b"
                      darkColor="#f8fafc"
                      className="relative h-full flex flex-col no-underline"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div
                          className={`w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}
                        >
                          <feature.icon
                            className={`w-6 h-6 ${iconColors[index]}`}
                          />
                        </div>
                        {index === 0 && (
                          <span className="px-3 py-1 text-xs font-bold tracking-wide bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30">
                            NEW
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {feature.title}
                      </h3>

                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 grow">
                        {feature.description}
                      </p>

                      <div className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        Learn more <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </StyledLink>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Real-World Applications */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Real-World Applications
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              See how VibeX transforms work across industries.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {useCases.map((useCase, index) => {
              const borderColors = [
                "border-blue-200 dark:border-blue-800",
                "border-purple-200 dark:border-purple-800",
                "border-emerald-200 dark:border-emerald-800",
                "border-orange-200 dark:border-orange-800",
              ];
              const iconBg = [
                "bg-linear-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
                "bg-linear-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30",
                "bg-linear-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30",
                "bg-linear-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30",
              ];
              const iconColors = [
                "text-blue-600 dark:text-blue-400",
                "text-purple-600 dark:text-purple-400",
                "text-emerald-600 dark:text-emerald-400",
                "text-orange-600 dark:text-orange-400",
              ];

              return (
                <motion.div
                  key={useCase.title}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className={`group relative text-center bg-white dark:bg-slate-800 p-8 rounded-xl border-2 ${borderColors[index]} hover:shadow-lg transition-all duration-300 overflow-hidden`}
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className={iconColors[index]}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="30"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className={iconColors[index]}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className={iconColors[index]}
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`w-16 h-16 ${iconBg[index]} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:shadow-md transition-shadow`}
                    >
                      <useCase.icon
                        className={`w-8 h-8 ${iconColors[index]}`}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r ${iconBg[index]} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                  ></div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 bg-white dark:bg-slate-900">
        <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-slate-50 dark:from-slate-800/50 to-transparent"></div>
        <div className="relative max-w-4xl mx-auto px-4">
          <div className="relative bg-linear-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-xl overflow-hidden p-12 text-center">
            {/* Large X pattern background */}
            <div className="absolute inset-0 opacity-10">
              <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="cta-x-pattern"
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M20 20L80 80M80 20L20 80"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <path
                      d="M0 50L50 100M50 0L100 50"
                      stroke="white"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                    <path
                      d="M0 50L50 0M50 100L100 50"
                      stroke="white"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-x-pattern)" />
              </svg>
            </div>

            {/* Animated X elements */}
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, repeatType: "reverse" },
              }}
              className="absolute -top-20 -left-20 w-40 h-40 opacity-20"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M20 20L80 80M80 20L20 80"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
            </motion.div>

            <motion.div
              animate={{
                rotate: -360,
                scale: [1.2, 1, 1.2],
              }}
              transition={{
                rotate: { duration: 25, repeat: Infinity, ease: "linear" },
                scale: { duration: 5, repeat: Infinity, repeatType: "reverse" },
              }}
              className="absolute -bottom-16 -right-16 w-56 h-56 opacity-15"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M10 10L90 90M90 10L10 90"
                  stroke="white"
                  strokeWidth="3"
                />
              </svg>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={containerVariants}
              className="relative"
            >
              <motion.h2
                variants={itemVariants}
                className="text-3xl md:text-4xl font-bold text-white mb-4"
              >
                Ready to Experience Vibe-X?
              </motion.h2>
              <motion.p
                variants={itemVariants}
                className="text-lg text-blue-100 max-w-2xl mx-auto mb-8"
              >
                Join the next generation of human-AI collaboration with
                transparent, cost-efficient, and truly collaborative intelligent
                systems.
              </motion.p>
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <StyledLink
                  href="/docs/tutorials/0-bootstrap"
                  lightColor="#2563eb"
                  darkColor="#2563eb"
                  className="inline-flex items-center bg-white font-bold px-8 py-4 rounded-lg transition-transform duration-200 hover:scale-105 shadow-lg no-underline"
                >
                  Start Building
                  <ArrowRight className="w-4 h-4 ml-2" />
                </StyledLink>
                <Link
                  href="https://github.com/dustland/vibex/tree/main/examples"
                  target="_blank"
                  style={{ color: "#ffffff" }}
                  className="inline-flex items-center border border-blue-400 font-medium px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 hover:bg-white/10 no-underline"
                >
                  View Examples
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-linear-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 pt-20 pb-12 overflow-hidden">
        {/* Subtle X pattern background */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="footer-x-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M10 10L20 20M20 10L10 20"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-slate-600"
                />
                <path
                  d="M20 20L30 30M30 20L20 30"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-slate-600"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footer-x-pattern)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Image
                    src={`/logo.png`}
                    alt="VibeX"
                    className="w-10 h-10"
                    width={40}
                    height={40}
                  />
                  <div className="absolute -inset-1 bg-blue-500/20 rounded-lg blur-sm"></div>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  VibeX
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                The framework for human-AI collaboration with intelligent
                parallel execution.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/dustland/vibex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
                >
                  <Github className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
                >
                  <svg
                    className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Resources Column */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/docs/getting-started"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    Getting Started
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/design/overview"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    Architecture
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/api"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    API Reference
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/tutorials/0-bootstrap"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    Tutorials
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community Column */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Community
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com/dustland/vibex/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    GitHub Discussions
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/dustland/vibex/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    Report Issues
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/dustland/vibex/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    Contributing
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
                  >
                    Blog
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Quick Start Column */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Quick Start
              </h3>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-4">
                <code className="text-sm font-mono text-slate-700 dark:text-slate-300">
                  npm install vibex
                </code>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                Get started in seconds with our TypeScript package.
              </p>
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                View Documentation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span>&copy; {new Date().getFullYear()} VibeX.</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">Built with ❤️ by</span>
                <a
                  href="https://github.com/dustland"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Tiwater
                </a>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <Link
                  href="/privacy"
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Terms
                </Link>
                <a
                  href="https://github.com/dustland/vibex/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  License
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
