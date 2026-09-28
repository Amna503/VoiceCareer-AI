/**
 * Career Engine — Role Catalog
 *
 * Structured, role-aware career data. This is the knowledge base the roadmap is
 * generated FROM; it deliberately does NOT contain a "week 1 / week 2 / week 3 /
 * week 4" plan. Weeks are composed at request time in roadmap.js by prioritising
 * the candidate's actual skill gaps against this catalog.
 *
 * Every skill carries a playbook so the generator can turn a gap into concrete,
 * domain-specific work without inventing generic filler:
 *   learn    -> what to study for that skill
 *   practice -> a hands-on drill for that skill
 *   project  -> a deliverable that proves the skill
 *   outcome  -> the observable milestone the week is aiming at
 */

/** Compact skill definition used by every role below. */
function skill(name, description, playbook = {}) {
  return {
    skill: name,
    description,
    learn: playbook.learn || `Work through a focused ${name} course or reference`,
    practice: playbook.practice || `Complete hands-on ${name} exercises`,
    project: playbook.project || `Build something real that uses ${name}`,
    outcome: playbook.outcome || `Demonstrable ${name} on real work, not just exercises`,
  };
}

export const CAREER_ROLE_REQUIREMENTS = {
  frontend: {
    title: "Frontend Developer",
    family: "engineering",
    aliases: [
      "frontend developer", "front-end developer", "frontend engineer", "front end developer",
      "web developer", "ui developer", "react developer", "vue developer", "angular developer",
    ],
    critical: [
      skill("HTML", "Semantic markup, forms, and accessibility", {
        learn: "Semantic HTML5 elements, document structure, forms and ARIA basics",
        practice: "Rebuild an existing page with semantic elements only, then audit it with a screen reader",
        project: "Accessible multi-section marketing site for a real business",
        outcome: "Ship a semantic page that passes a Lighthouse accessibility audit",
      }),
      skill("CSS", "Layouts, specificity, and the cascade", {
        learn: "Box model, Flexbox, Grid, specificity, and the cascade",
        practice: "Recreate three real-world layouts with Flexbox and again with Grid",
        project: "Responsive layout system with reusable utility classes",
        outcome: "Can build any two-column responsive layout without a framework",
      }),
      skill("JavaScript", "ES6+, DOM, async programming, and modules", {
        learn: "ES6+ syntax, closures, modules, promises, async/await, and the DOM",
        practice: "Build a data-driven UI that fetches from a live API and handles loading and error states",
        project: "Interactive app consuming a public REST API with search, filter, and pagination",
        outcome: "Can wire a page to an API and handle async success, failure, and empty states",
      }),
      skill("React", "Components, hooks, and state management", {
        learn: "Components, JSX, props, useState, useEffect, and lifting state",
        practice: "Convert the vanilla JS app into components and manage cross-component state",
        project: "Multi-view React app with routing, forms, and a shared state layer",
        outcome: "Can architect a React app without copying a starter template",
      }),
    ],
    important: [
      skill("State Management", "Local vs global state, and when each is appropriate", {
        learn: "Context, reducer patterns, and derived state vs duplicated state",
        practice: "Refactor a prop-drilling-heavy component tree to use context",
      }),
      skill("API Integration", "REST/GraphQL data fetching, caching, and error states", {
        learn: "Fetch lifecycle, custom hooks for data, optimistic updates",
        practice: "Add loading, empty, and retry states to every data-backed view",
      }),
      skill("Responsive Design", "Mobile-first layout and breakpoint strategy", {
        learn: "Mobile-first CSS, fluid units, container queries",
        practice: "Take one desktop layout down to 320px without horizontal scroll",
      }),
      skill("Testing", "Unit and component testing for frontend code", {
        learn: "Vitest/Jest assertions, React Testing Library queries, mocking",
        practice: "Write tests for three components, including one async data component",
      }),
      skill("Git", "Branching, review workflows, and clean history", {
        learn: "Branching strategies, rebasing, and writing reviewable commits",
        practice: "Run a full feature branch with three reviewable commits",
      }),
    ],
    niceToHave: [
      skill("TypeScript", "Type safety and better developer experience", {
        learn: "Generics, narrowing, and typing React props and API responses",
      }),
      skill("Next.js", "Server-side rendering and the App Router", {
        learn: "App Router, server components, and data fetching conventions",
      }),
      skill("Tailwind CSS", "Utility-first styling and design systems", {
        learn: "Utility composition, responsive and state variants, theming",
      }),
      skill("Performance Optimization", "Core Web Vitals, code splitting, lazy loading", {
        learn: "Profiling, bundle splitting, and render-cost reduction",
      }),
    ],
    interviewThemes: [
      "component design and state ownership",
      "rendering performance and re-render causes",
      "event delegation, closures, and async error handling",
      "accessibility and semantic markup decisions",
    ],
    portfolioIdeas: [
      "a production-style dashboard with charts and filters",
      "an accessible open-source component library",
      "a real-time app backed by a documented third-party API",
    ],
    resources: [
      { name: "MDN Web Docs", type: "article", url: "https://developer.mozilla.org" },
      { name: "The Odin Project", type: "course", url: "https://www.theodinproject.com" },
      { name: "React docs", type: "article", url: "https://react.dev/learn" },
    ],
  },

  backend: {
    title: "Backend Developer",
    family: "engineering",
    aliases: [
      "backend developer", "back-end developer", "backend engineer", "back end developer",
      "node developer", "nodejs developer", "api developer", "server side developer",
    ],
    critical: [
      skill("Node.js", "Event loop, modules, and the runtime", {
        learn: "Event loop, async I/O, streams, and the module system",
        practice: "Write a script that processes a large file without blocking the event loop",
        project: "A CLI or worker that runs concurrent network requests with a concurrency limit",
        outcome: "Can explain the event loop and write non-blocking server code",
      }),
      skill("Express.js", "Routing, middleware, and request handling", {
        learn: "Router composition, middleware order, and error-handling middleware",
        practice: "Build a router with auth, logging, and validation middleware in the right order",
        project: "REST service with versioning, health checks, and centralised error handling",
        outcome: "Can structure an Express app that stays maintainable as routes grow",
      }),
      skill("REST APIs", "Resource design, status codes, and contracts", {
        learn: "Resource modelling, HTTP semantics, idempotency, and pagination",
        practice: "Design and document the contract for a comment API, including error shapes",
        project: "Versioned CRUD API with filtering, sorting, and pagination",
        outcome: "Can design an API another team can consume without asking you questions",
      }),
      skill("Database", "SQL and NoSQL data modelling and querying", {
        learn: "Relational modelling, normalisation, indexes, and query plans",
        practice: "Model a domain in third normal form and write the 10 queries the app needs",
        project: "Database schema with migrations, constraints, and seed data",
        outcome: "Can model data and justify your index choices",
      }),
    ],
    important: [
      skill("Authentication", "Sessions, JWT, and OAuth flows", {
        learn: "Password hashing, session vs token tradeoffs, refresh rotation",
        practice: "Implement login with secure cookies plus refresh-token rotation",
      }),
      skill("Authorization", "Role checks and ownership-based access control", {
        learn: "RBAC, object-level permissions, and deny-by-default design",
        practice: "Add permission checks that fail closed on every mutating route",
      }),
      skill("Error Handling", "Typed errors, retries, and observability", {
        learn: "Custom error classes, structured logging, and retry with backoff",
        practice: "Replace every generic catch with a typed error and a meaningful status code",
      }),
      skill("Testing", "API and integration testing", {
        learn: "Supertest-style request testing, fixtures, and test isolation",
        practice: "Write integration tests for the happy path and two failure modes",
      }),
      skill("Security", "Input validation, rate limiting, and injection prevention", {
        learn: "Parameterised queries, output encoding, and dependency auditing",
        practice: "Threat-model one endpoint and fix what you find",
      }),
    ],
    niceToHave: [
      skill("Docker", "Containerising services and dependencies", {
        learn: "Dockerfiles, multi-stage builds, and Compose",
      }),
      skill("CI/CD", "Automated build, test, and deploy pipelines", {
        learn: "Pipeline stages, caching, and deployment promotion",
      }),
      skill("Caching", "Redis, cache invalidation, and rate limiting", {
        learn: "Cache-aside, TTLs, and stampede protection",
      }),
      skill("Observability", "Metrics, traces, and structured logging", {
        learn: "RED metrics, request tracing, and alerting on SLOs",
      }),
    ],
    interviewThemes: [
      "system design for a chosen domain",
      "database indexing and query performance",
      "authentication and authorisation tradeoffs",
      "concurrency, idempotency, and failure handling",
    ],
    portfolioIdeas: [
      "a documented, deployed API with a working frontend client",
      "an event-driven service with a real message queue",
      "a self-hosted project with CI, tests, and a written design doc",
    ],
    resources: [
      { name: "Node.js docs", type: "article", url: "https://nodejs.org/en/docs" },
      { name: "SQLBolt", type: "course", url: "https://sqlbolt.com" },
      { name: "systemdesign.pray", type: "article", url: "https://systemdesign.pray" },
    ],
  },

  fullstack: {
    title: "Full-Stack Developer",
    family: "engineering",
    aliases: [
      "fullstack developer", "full stack developer", "full-stack engineer", "fullstack engineer",
      "software engineer", "web application developer", "product engineer",
    ],
    critical: [
      skill("JavaScript", "Language core shared by both sides of the stack", {
        learn: "ES6+, modules, async patterns, and error handling",
        practice: "Build a shared validation and API-client module used by every feature",
        project: "A typed, reusable client layer over a REST API",
        outcome: "Has a shared foundation both the UI and the server can build on",
      }),
      skill("Frontend Fundamentals", "Component UI, state, and browser APIs", {
        learn: "Components, state management, routing, and forms",
        practice: "Build a multi-view UI with real loading and error states",
        project: "Feature-complete UI for one workflow of your app",
        outcome: "Can ship a usable interface without a designer",
      }),
      skill("Backend Fundamentals", "Server, routing, and data persistence", {
        learn: "HTTP servers, routing, middleware, and database access",
        practice: "Expose the data the frontend needs behind a clean API",
        project: "Service layer with validation and error handling",
        outcome: "Can design the API contract before writing the UI",
      }),
      skill("Database", "Schema design and query writing", {
        learn: "Modelling, migrations, indexes, and joins",
        practice: "Model the domain and write the queries the API needs",
        project: "Schema with migrations and constraints",
        outcome: "Can model data end to end without a backend engineer",
      }),
    ],
    important: [
      skill("TypeScript", "Shared types between client and server", {
        learn: "Shared types, runtime validation, and narrowing",
        practice: "Share one types module between the API and the UI",
      }),
      skill("Authentication", "Session handling across the full stack", {
        learn: "Cookies, sessions, and secure token flows",
        practice: "Add login, logout, and protected routes to both sides",
      }),
      skill("Testing", "End-to-end and unit testing", {
        learn: "Test pyramid, fixtures, and end-to-end user journeys",
        practice: "Write end-to-end tests for the three core user journeys",
      }),
      skill("Deployment", "Hosting, environment config, and CI", {
        learn: "Environment variables, build pipelines, and hosting platforms",
        practice: "Deploy the app with a documented setup path",
      }),
      skill("Git", "Branching and collaborative workflow", {
        learn: "Branching strategy and reviewable commits",
        practice: "Ship one feature through a full branch and review cycle",
      }),
    ],
    niceToHave: [
      skill("WebSockets", "Real-time bidirectional communication", {
        learn: "Connection lifecycle, reconnection, and message framing",
      }),
      skill("Caching", "HTTP caching and server-side memoisation", {
        learn: "ETags, cache invalidation, and query memoisation",
      }),
      skill("Cloud Basics", "Managed services, object storage, and queues", {
        learn: "Managed databases, file storage, and job queues",
      }),
    ],
    interviewThemes: [
      "end-to-end feature design and tradeoffs",
      "data flow from database to UI",
      "authentication across client and server",
      "shipping, deployment, and debugging in production",
    ],
    portfolioIdeas: [
      "one complete, deployed product with a real user flow",
      "an open-source full-stack starter others actually use",
      "a rebuild of a known product with a written architecture doc",
    ],
    resources: [
      { name: "The Odin Project", type: "course", url: "https://www.theodinproject.com" },
      { name: "Full Stack Open", type: "course", url: "https://fullstackopen.com" },
      { name: "MDN Web Docs", type: "article", url: "https://developer.mozilla.org" },
    ],
  },

  data: {
    title: "Data Analyst",
    family: "data",
    aliases: [
      "data analyst", "business analyst", "analytics analyst", "data analytics",
      "reporting analyst", "insights analyst", "business intelligence analyst", "bi analyst",
    ],
    critical: [
      skill("SQL", "Querying, joins, aggregation, and window functions", {
        learn: "SELECT fundamentals through window functions and CTEs",
        practice: "Answer 20 business questions against a messy real dataset in pure SQL",
        project: "A reusable query library documenting every business metric definition",
        outcome: "Can answer ambiguous business questions with SQL alone",
      }),
      skill("Python", "Analysis scripting with pandas and numpy", {
        learn: "Python basics, pandas DataFrames, grouping, and joins",
        practice: "Load a CSV, clean it, and compute grouped metrics end to end",
        project: "A reproducible notebook-style analysis script with a written method",
        outcome: "Can move from raw file to a defensible number without manual steps",
      }),
      skill("Data Cleaning", "Missing values, types, duplicates, and outliers", {
        learn: "Profiling, imputation, deduplication, and validation checks",
        practice: "Clean a deliberately dirty dataset and log every decision you made",
        project: "A repeatable cleaning pipeline that runs on new files",
        outcome: "Can defend every transformation you applied to the data",
      }),
      skill("Data Visualization", "Chart choice, encoding, and storytelling", {
        learn: "Which chart answers which question, and how to avoid misleading encodings",
        practice: "Redesign three bad charts so each one answers a question clearly",
        project: "A visual report that leads a reader to one conclusion",
        outcome: "Can pick the right chart without guessing",
      }),
    ],
    important: [
      skill("Statistics", "Distributions, sampling, and hypothesis testing", {
        learn: "Descriptive statistics, confidence intervals, and significance testing",
        practice: "A/B test an example dataset and write up whether the result is real",
      }),
      skill("Excel", "Advanced formulas, pivot tables, and cleaning", {
        learn: "XLOOKUP, dynamic arrays, pivot tables, and Power Query",
        practice: "Rebuild a messy spreadsheet report with a pivot table",
      }),
      skill("Power BI/Tableau", "Interactive dashboards and DAX basics", {
        learn: "Data modelling, relationships, and interactive dashboard design",
        practice: "Build a three-page dashboard with filters that actually work",
      }),
      skill("pandas", "Data manipulation at scale", {
        learn: "Indexing, groupby, merge, and time-series resampling",
        practice: "Join five imperfect datasets into one analysis-ready table",
      }),
      skill("Communication", "Turning analysis into a recommendation", {
        learn: "Answer-first writing, audience framing, and next steps",
        practice: "Turn one analysis into a one-page memo with a clear recommendation",
      }),
    ],
    niceToHave: [
      skill("SQL Optimisation", "Reading query plans and fixing slow queries", {
        learn: "Execution plans, indexing strategy, and cost-based optimisation",
      }),
      skill("dbt", "Version-controlled, tested transformation models", {
        learn: "Models, tests, and documentation in dbt",
      }),
      skill("ETL & Data Pipelines", "Scheduling and orchestrating data flows", {
        learn: "Airflow-style DAGs, scheduling, and idempotent jobs",
      }),
      skill("Statistics for A/B Tests", "Power, effect size, and practical significance", {
        learn: "Power analysis and guardrail metrics",
      }),
    ],
    interviewThemes: [
      "business question to metric definition to query",
      "data quality problems you found and how you handled them",
      "explaining a result to a non-technical stakeholder",
      "SQL and statistics questions asked live",
    ],
    portfolioIdeas: [
      "an end-to-end analysis of a public dataset with a written narrative",
      "an interactive dashboard answering a real business question",
      "a documented metrics layer others reuse",
    ],
    resources: [
      { name: "SQLBolt", type: "course", url: "https://sqlbolt.com" },
      { name: "pandas docs", type: "article", url: "https://pandas.pydata.org/docs" },
      { name: "Mode SQL tutorial", type: "course", url: "https://mode.com/sql-tutorial" },
    ],
  },

  ml: {
    title: "AI/ML Engineer",
    family: "data",
    aliases: [
      "ai/ml engineer", "ai ml engineer", "machine learning engineer", "ml engineer",
      "ai engineer", "machine learning scientist", "data scientist", "ml developer",
      "deep learning engineer", "nlp engineer",
    ],
    critical: [
      skill("Python", "The working language for ML systems", {
        learn: "Python fluency, virtual environments, typing, and packaging",
        practice: "Package an analysis into an importable module with a test",
        project: "A clean, installable project skeleton for your ML work",
        outcome: "Can write Python that other people can run",
      }),
      skill("NumPy/pandas", "Vectorised data manipulation", {
        learn: "Array broadcasting, indexing, groupby, and joins",
        practice: "Vectorise a slow loop and benchmark the difference",
        project: "A reusable data-preparation module for your datasets",
        outcome: "Handles real datasets without slow Python loops",
      }),
      skill("Machine Learning", "Supervised learning, validation, and classical models", {
        learn: "Regression, classification, trees, ensembles, and the bias/variance tradeoff",
        practice: "Train and honestly validate three models on one dataset",
        project: "A baseline model with a proper train/validation split",
        outcome: "Can choose and justify a model for a given problem",
      }),
      skill("Model Evaluation", "Metrics, cross-validation, and leakage", {
        learn: "Precision/recall/F1, ROC-AUC, cross-validation, and data leakage",
        practice: "Find and fix a deliberate leakage bug in a pipeline",
        project: "An evaluation report explaining metric choice, not just the score",
        outcome: "Can tell whether a model is actually better than the baseline",
      }),
    ],
    important: [
      skill("Deep Learning", "Neural networks, backpropagation, and common architectures", {
        learn: "MLP and CNN fundamentals, backprop, and a framework like PyTorch",
        practice: "Train a small network from scratch before using a framework abstraction",
      }),
      skill("Feature Engineering", "Encoding, scaling, and feature selection", {
        learn: "Target/ordinal encoding, scaling, and leakage-safe pipelines",
        practice: "Build a scikit-learn Pipeline so preprocessing cannot leak",
      }),
      skill("APIs", "Serving models behind an interface", {
        learn: "REST and gRPC model serving, input schemas, and versioning",
        practice: "Wrap your model in an endpoint with a validated request schema",
      }),
      skill("Deployment", "Containerising and shipping models", {
        learn: "Docker for ML, model registries, and CI for training pipelines",
        practice: "Containerise the inference service and document the build",
      }),
      skill("Statistics", "Probability, distributions, and inference", {
        learn: "Bayesian thinking, distributions, and hypothesis testing",
        practice: "Derive the intuition behind a confidence interval you use at work",
      }),
    ],
    niceToHave: [
      skill("MLOps", "Experiment tracking, monitoring, and retraining", {
        learn: "Experiment tracking, drift detection, and retraining triggers",
      }),
      skill("NLP", "Text preprocessing, embeddings, and transformers", {
        learn: "Tokenisation, embeddings, and transformer fine-tuning",
      }),
      skill("Vector Databases", "Similarity search and retrieval pipelines", {
        learn: "Embeddings, vector indexes, and RAG patterns",
      }),
      skill("MLOps & Monitoring", "Model monitoring and rollback", {
        learn: "Shadow deployment, canary releases, and rollback",
      }),
    ],
    interviewThemes: [
      "model choice and why the baseline was the right baseline",
      "data leakage, overfitting, and validation strategy",
      "serving latency, scaling, and reliability of inference",
      "a real ML project walked through end to end",
    ],
    portfolioIdeas: [
      "a deployed model with a working API and a written evaluation report",
      "a Kaggle or dataset analysis with reproducible notebooks",
      "a retrieval-augmented assistant with cited sources",
    ],
    resources: [
      { name: "scikit-learn tutorials", type: "course", url: "https://scikit-learn.org/stable/tutorial.html" },
      { name: "fast.ai", type: "course", url: "https://course.fast.ai" },
      { name: "pandas docs", type: "article", url: "https://pandas.pydata.org/docs" },
    ],
  },

  cybersecurity: {
    title: "Cybersecurity Analyst",
    family: "security",
    aliases: [
      "cybersecurity analyst", "cyber security analyst", "security analyst",
      "infosec analyst", "information security analyst", "soc analyst",
      "security operations analyst", "cyber security engineer", "security engineer",
    ],
    critical: [
      skill("Networking Fundamentals", "TCP/IP, DNS, HTTP, and traffic analysis", {
        learn: "OSI and TCP/IP layers, DNS resolution, TLS handshakes, and packet structure",
        practice: "Capture and explain a full DNS and HTTPS exchange from the command line",
        project: "A written packet-analysis report on traffic you captured yourself",
        outcome: "Can read a network trace and explain what happened",
      }),
      skill("Linux", "Shell fluency, permissions, logs, and tooling", {
        learn: "Filesystem, permissions, process management, and system logs",
        practice: "Find the answer to three incident questions using only the shell",
        project: "A triage script that summaries logs from a provided folder",
        outcome: "Can navigate and investigate a Linux host without a GUI",
      }),
      skill("Security Fundamentals", "CIA triad, threat classes, and defence in depth", {
        learn: "Threat types, attack surfaces, risk, and control categories",
        practice: "Threat-model a small application and rank its top five risks",
        project: "A defence-in-depth design for one service you document",
        outcome: "Can explain a risk in business terms, not just jargon",
      }),
      skill("SIEM & Log Analysis", "Log correlation, detection rules, and triage", {
        learn: "Log sources, common log formats, correlation rules, and alert triage",
        practice: "Write five detection rules and triage the alerts they generate",
        project: "A detection pack with rules, tuning notes, and false-positive handling",
        outcome: "Can go from raw logs to a triaged alert",
      }),
    ],
    important: [
      skill("Threat Detection", "Indicators of compromise and detection engineering", {
        learn: "MITRE ATT&CK, indicator types, and detection lifecycle",
        practice: "Map a technique to a log source and write a detection for it",
      }),
      skill("Incident Response", "Preparation, detection, containment, and lessons learned", {
        learn: "IR lifecycle, evidence handling, and chain of custody",
        practice: "Run a tabletop exercise and write the timeline afterwards",
      }),
      skill("Vulnerability Assessment", "Scanning, prioritisation, and reporting", {
        learn: "CVSS scoring, scan types, and remediation prioritisation",
        practice: "Scan a deliberately vulnerable lab host and triage the results",
      }),
      skill("Scripting", "Automating analysis with Python or PowerShell", {
        learn: "Parsing logs, calling APIs, and handling JSON in a script",
        practice: "Automate a 30-minute manual triage task into one command",
      }),
      skill("Network Security", "Firewalls, segmentation, and secure configuration", {
        learn: "Segmentation models, firewall policy, and hardening baselines",
        practice: "Write a hardening checklist for a given service and justify each item",
      }),
    ],
    niceToHave: [
      skill("Cloud Security", "IAM, cloud logging, and shared responsibility", {
        learn: "IAM policies, cloud audit logs, and storage exposure",
      }),
      skill("Reverse Engineering", "Static analysis of suspicious binaries", {
        learn: "Disassembly, strings analysis, and behavioural triage",
      }),
      skill("Malware Analysis", "Static and dynamic analysis in a lab", {
        learn: "Sandboxing, indicators extraction, and reporting",
      }),
      skill("Threat Intelligence", "Feeds, pivoting, and intelligence requirements", {
        learn: "STIX/TAXII-style feeds and intelligence requirements",
      }),
    ],
    interviewThemes: [
      "a real incident walked through timeline-first",
      "log analysis and how you reached a conclusion",
      "prioritising vulnerabilities under time pressure",
      "detection rules: what they catch and what they cost",
    ],
    portfolioIdeas: [
      "a detection pack with documented rules and tuning",
      "a home-lab writeup with commands, screenshots, and findings",
      "a vulnerability assessment report with prioritised remediation",
    ],
    resources: [
      { name: "MITRE ATT&CK", type: "article", url: "https://attack.mitre.org" },
      { name: "TryHackMe SOC Level 1", type: "course", url: "https://tryhackme.com" },
      { name: "Linux Journey", type: "course", url: "https://linuxjourney.com" },
    ],
  },

  devops: {
    title: "DevOps Engineer",
    family: "infrastructure",
    aliases: [
      "devops engineer", "devops", "cloud engineer", "site reliability engineer", "sre",
      "platform engineer", "infrastructure engineer", "release engineer",
    ],
    critical: [
      skill("Linux & Systems", "Processes, networking, and services on a host", {
        learn: "systemd, processes, disk and memory diagnostics, and core networking",
        practice: "Diagnose a deliberately broken service and find the root cause",
        project: "A troubleshooting runbook for three common host failures",
        outcome: "Can debug an unfamiliar host quickly and safely",
      }),
      skill("Containers", "Docker images, Compose, and runtime behaviour", {
        learn: "Layering, caching, entrypoints, and container networking",
        practice: "Containerise a service and shrink its image by at least half",
        project: "A reproducible multi-service stack running from one command",
        outcome: "Can build small, secure, cacheable images",
      }),
      skill("CI/CD", "Build pipelines, testing gates, and release automation", {
        learn: "Pipeline stages, caching, secrets handling, and deployment strategies",
        practice: "Build a pipeline that runs tests, builds an image, and deploys on merge",
        project: "A green pipeline with a real staging deployment",
        outcome: "Can take a commit to production repeatably",
      }),
      skill("Infrastructure as Code", "Terraform or equivalent state management", {
        learn: "Resources, state, modules, and drift detection",
        practice: "Provision a whole environment from a single config file",
        project: "An environment definition that can be recreated from scratch",
        outcome: "Can rebuild infrastructure on demand",
      }),
    ],
    important: [
      skill("Cloud Platforms", "AWS/GCP/Azure managed services and networking", {
        learn: "Compute, storage, IAM, and VPC fundamentals on one cloud",
        practice: "Deploy a service with a managed database and least-privilege IAM",
      }),
      skill("Kubernetes", "Pods, deployments, services, and observability", {
        learn: "Workloads, services, config, and resource limits",
        practice: "Deploy and scale an app, then read its logs and metrics",
      }),
      skill("Monitoring & Alerting", "Metrics, logs, traces, and on-call hygiene", {
        learn: "Golden signals, SLOs, and actionable alerts",
        practice: "Define SLOs for a service and build alerts that page only on real pain",
      }),
      skill("Security in the Pipeline", "Image scanning, secrets, and least privilege", {
        learn: "Secret management, image scanning, and supply-chain basics",
        practice: "Add scanning and secret handling to an existing pipeline",
      }),
    ],
    niceToHave: [
      skill("GitOps", "Declarative delivery from git", { learn: "Flux/ArgoCD patterns and reconciliation" }),
      skill("Observability", "Distributed tracing and metrics pipelines", { learn: "OpenTelemetry pipelines" }),
      skill("Cost Optimisation", "Instance sizing, spot capacity, and tagging", {
        learn: "Instance sizing, spot capacity, and tagging",
      }),
    ],
    interviewThemes: [
      "a production incident and how you mitigated it",
      "pipeline design and release safety",
      "capacity, scaling, and cost tradeoffs",
      "incident response and blameless postmortems",
    ],
    portfolioIdeas: [
      "a self-hosted platform with IaC and a documented runbook",
      "a CI/CD pipeline with real staging and rollback",
      "a homelab documented end to end, including the failures",
    ],
    resources: [
      { name: "Terraform Registry", type: "article", url: "https://registry.terraform.io" },
      { name: "Kubernetes docs", type: "article", url: "https://kubernetes.io/docs" },
      { name: "learnk8s", type: "course", url: "https://learnk8s.io" },
    ],
  },

  qa: {
    title: "QA / Test Automation Engineer",
    family: "engineering",
    aliases: [
      "qa engineer", "quality assurance engineer", "test engineer", "test automation engineer",
      "sdet", "software development engineer in test", "qa analyst",
    ],
    critical: [
      skill("Test Strategy", "What to test, at which level, and why", {
        learn: "Test pyramid, risk-based prioritisation, and coverage tradeoffs",
        practice: "Write a test strategy document for a real feature before writing any code",
        project: "A documented strategy with a justified automation scope",
        outcome: "Can defend what you chose not to automate",
      }),
      skill("Automation Frameworks", "Selenium, Playwright, or Cypress", {
        learn: "Selectors, waits, fixtures, and test independence",
        practice: "Automate a five-step user journey with reliable selectors",
        project: "A stable suite that passes on a clean checkout every run",
        outcome: "Can build a suite that does not flake",
      }),
      skill("API Testing", "Contract, integration, and negative API tests", {
        learn: "REST request building, assertions, and schema validation",
        practice: "Write a positive, a negative, and an authorisation test per endpoint",
        project: "A full API regression suite runnable in CI",
        outcome: "Can validate an API independently of the UI",
      }),
      skill("CI for Tests", "Running, sharding, and reporting test results", {
        learn: "CI test stages, parallelism, and readable failure reports",
        practice: "Wire a suite into a pipeline and cut runtime with sharding",
        project: "A pipeline where tests gate the deploy",
        outcome: "Makes the suite the source of truth for release safety",
      }),
    ],
    important: [
      skill("Defect Reporting", "Reproduction, severity, and evidence", {
        learn: "Writing bugs a developer can act on without a call",
        practice: "Write five defect reports from real repro steps",
      }),
      skill("Database & SQL for QA", "Validating data and seeding test states", {
        learn: "Querying test data and asserting backend state directly",
        practice: "Verify a UI action's effect with a direct SQL assertion",
      }),
      skill("Performance & Load", "Baselines, load profiles, and reading results", {
        learn: "Load, stress, and soak testing with meaningful thresholds",
        practice: "Run a load test and identify the actual bottleneck",
      }),
      skill("Mobile & Cross-browser", "Device coverage and platform differences", {
        learn: "Device labs, viewport testing, and platform-specific bugs",
        practice: "Find and document a real cross-browser rendering bug",
      }),
    ],
    niceToHave: [
      skill("Security Testing", "Basic OWASP checks in the test plan", { learn: "OWASP Top 10 in a test plan" }),
      skill("Test Data Management", "Factories, fixtures, and isolation", { learn: "Data factories and test isolation" }),
      skill("Observability for QA", "Reading logs to verify a fix", { learn: "Log correlation during verification" }),
    ],
    interviewThemes: [
      "a bug you found that a developer had missed",
      "test strategy decisions and what you deliberately skipped",
      "automation framework design and maintenance cost",
      "triage and prioritisation under a release deadline",
    ],
    portfolioIdeas: [
      "an open-source repo with a green, fast, non-flaky suite",
      "a documented test strategy and automation report for a real app",
      "a performance test suite with real bottleneck findings",
    ],
    resources: [
      { name: "Playwright docs", type: "article", url: "https://playwright.dev/docs" },
      { name: "Martin Fowler on testing", type: "article", url: "https://martinfowler.com/articles/microservicesTesting.html" },
      { name: "k6 docs", type: "course", url: "https://k6.io/docs" },
    ],
  },

  mobile: {
    title: "Mobile App Developer",
    family: "engineering",
    aliases: [
      "mobile developer", "mobile app developer", "ios developer", "android developer",
      "react native developer", "flutter developer", "mobile engineer",
    ],
    critical: [
      skill("Mobile Fundamentals", "Lifecycle, navigation, and platform conventions", {
        learn: "Activity/view lifecycle, navigation stacks, and state restoration",
        practice: "Build a multi-screen app that survives backgrounding and rotation",
        project: "A multi-screen app with deep navigation and saved state",
        outcome: "Ships an app that behaves correctly on a real device",
      }),
      skill("Kotlin/Swift", "The native language for the target platform", {
        learn: "Language fluency plus the platform's idiomatic patterns",
        practice: "Rewrite one feature from a tutorial in idiomatic platform style",
        project: "A native module exposing a clean, testable API",
        outcome: "Can read and write idiomatic platform code",
      }),
      skill("Cross-platform Frameworks", "React Native or Flutter fundamentals", {
        learn: "Component model, platform channels, and the bridge boundary",
        practice: "Build one screen that calls a native module",
        project: "A cross-platform app sharing logic with a thin platform layer",
        outcome: "Knows exactly where the abstraction should stop",
      }),
      skill("API & Local Storage", "Networking, caching, and offline behaviour", {
        learn: "HTTP clients, serialisation, and local persistence",
        practice: "Build an app that works offline and syncs when it can",
        project: "A data layer with caching and conflict handling",
        outcome: "Can handle slow, missing, and stale network states",
      }),
    ],
    important: [
      skill("App Store Submission", "Build, signing, and review guidelines", {
        learn: "Release builds, signing, and store review rules",
        practice: "Produce a signed release build and a store-ready listing",
      }),
      skill("Push Notifications", "Registration, delivery, and failure handling", {
        learn: "Token registration, payload handling, and opt-in UX",
        practice: "Implement push with graceful failure when permission is denied",
      }),
      skill("Performance on Device", "Startup time, memory, and battery", {
        learn: "Profiling on a real device and the usual performance traps",
        practice: "Profile an app you built and fix the top two hotspots",
      }),
      skill("UI & Accessibility", "Platform design systems and screen readers", {
        learn: "Human Interface Guidelines or Material, plus accessibility",
        practice: "Make one screen fully accessible and test with a screen reader",
      }),
    ],
    niceToHave: [
      skill("CI for Mobile", "Automated builds and test pipelines", { learn: "Fastlane-style release automation" }),
      skill("Deep Linking", "Universal links and deep link routing", { learn: "Link routing and attribution" }),
      skill("Analytics", "Event tracking and crash reporting", { learn: "Event design and funnel tracking" }),
    ],
    interviewThemes: [
      "app architecture and where you draw the platform boundary",
      "lifecycle, state restoration, and backgrounding",
      "performance measured on a real device",
      "shipping, review rejection, and release management",
    ],
    portfolioIdeas: [
      "a real app published to a store with installs",
      "a cross-platform app with documented performance measurements",
      "an open-source library for mobile developers",
    ],
    resources: [
      { name: "React Native docs", type: "article", url: "https://reactnative.dev/docs/getting-started" },
      { name: "Android developer docs", type: "article", url: "https://developer.android.com" },
      { name: "Apple developer docs", type: "article", url: "https://developer.apple.com/documentation" },
    ],
  },

  general: {
    title: "General Professional",
    family: "professional",
    aliases: ["general", "other", "general professional", "non technical", "career changer"],
    critical: [
      skill("Communication", "Clear, structured, audience-aware writing and speaking", {
        learn: "Structuring a message, active listening, and adapting to your audience",
        practice: "Rewrite three work messages to be clearer and shorter",
        project: "A written case study or proposal you present to a real audience",
        outcome: "Can explain complex work clearly to a non-specialist",
      }),
      skill("Problem Solving", "Structured analysis and decision making under ambiguity", {
        learn: "Root-cause analysis, options framing, and decision criteria",
        practice: "Take one recurring problem and redesign the process around it",
        project: "A documented process improvement with measurable results",
        outcome: "Can show a problem you solved and how you knew it worked",
      }),
      skill("Collaboration", "Working across roles, teams, and stakeholders", {
        learn: "Stakeholder mapping, expectation setting, and giving feedback",
        practice: "Run a retrospective on a project and act on one finding",
        project: "A cross-team initiative you coordinated to completion",
        outcome: "Can show you moved a group forward without authority",
      }),
    ],
    important: [
      skill("Time Management", "Prioritisation, estimation, and focus", {
        learn: "Prioritisation frameworks and realistic estimation",
        practice: "Plan a week realistically and compare the plan to what happened",
      }),
      skill("Data & Analytical Thinking", "Reading numbers and evidence", {
        learn: "Reading a report, spotting a bad metric, and sanity-checking a claim",
        practice: "Take a real business metric and define it precisely",
      }),
      skill("Adaptability", "Learning new domains quickly", {
        learn: "Rapid domain acquisition and building a vocabulary quickly",
        practice: "Get fluent enough in an unfamiliar area to give an informed opinion in a week",
      }),
      skill("Presentation", "Structuring and delivering a persuasive talk", {
        learn: "Answer-first structure, evidence, and handling Q&A",
        practice: "Give a five-minute talk and record yourself",
      }),
    ],
    niceToHave: [
      skill("Project Management", "Planning, dependencies, and delivery", { learn: "Lightweight project planning" }),
      skill("Negotiation", "Finding value and handling disagreement", { learn: "Preparation and framing for negotiation" }),
      skill("Mentoring", "Helping others grow", { learn: "Coaching conversations and feedback frameworks" }),
    ],
    interviewThemes: [
      "a decision you made and how you validated it",
      "a conflict you navigated and what changed",
      "a failure you can talk about honestly",
      "how you prioritise when everything is urgent",
    ],
    portfolioIdeas: [
      "a documented case study of a real project",
      "a writing or presentation portfolio in your target field",
      "a volunteer or community project with measurable impact",
    ],
    resources: [
      { name: "Coursera", type: "course", url: "https://www.coursera.org" },
      { name: "Harvard Business Review", type: "article", url: "https://hbr.org" },
    ],
  },
};

/**
 * Skills that mean the same thing. Matching a candidate's stated skill against a
 * required skill uses these, so "JS" counts as JavaScript and "k8s" as Kubernetes.
 */
export const SKILL_ALIASES = {
  js: "javascript",
  "java script": "javascript",
  ts: "typescript",
  "type script": "typescript",
  reactjs: "react",
  "react.js": "react",
  nextjs: "next.js",
  nodejs: "node.js",
  "node js": "node.js",
  postgres: "postgresql",
  psql: "postgresql",
  mongo: "mongodb",
  k8s: "kubernetes",
  gcp: "google cloud",
  aws: "amazon web services",
  azure: "microsoft azure",
  bi: "business intelligence",
  "power bi": "power bi/tableau",
  tableau: "power bi/tableau",
  looker: "power bi/tableau",
  "power bi": "power bi/tableau",
  playwright: "automation frameworks",
  selenium: "automation frameworks",
  cypress: "automation frameworks",
  jest: "automation frameworks",
  vitest: "automation frameworks",
  appium: "mobile",
  postman: "api testing",
  rest: "rest apis",
  restful: "rest apis",
  splunk: "siem & log analysis",
  sentinel: "siem & log analysis",
  qradar: "siem & log analysis",
  elastic: "siem & log analysis",
  flask: "backend fundamentals",
  django: "backend fundamentals",
  spring: "backend fundamentals",
  mlops: "mlops",
  matlab: "statistics",
  ml: "machine learning",
  "machine-learning": "machine learning",
  "ai/ml": "machine learning",
  dl: "deep learning",
  llm: "large language models",
  llms: "large language models",
  siem: "siem & log analysis",
  soc: "security operations",
  infosec: "security fundamentals",
  "cyber security": "cybersecurity fundamentals",
  net: "networking fundamentals",
  "computer networking": "networking fundamentals",
  pen: "penetration testing",
  pentesting: "penetration testing",
  "threat intel": "threat intelligence",
  ci: "ci/cd",
  cicd: "ci/cd",
  cd: "ci/cd",
  iac: "infrastructure as code",
  terraform: "infrastructure as code",
  sre: "site reliability engineering",
  qa: "test strategy",
  sdet: "test automation",
  dbs: "database",
  db: "database",
  sql: "sql",
  np: "numpy",
  "numpy": "numpy",
  pd: "pandas",
  excel: "excel",
  "powerpoint": "presentation",
  "customer service": "communication",
};

/** Multi-word phrases we look for in a pasted job description. */
export const JD_SKILL_HINTS = [
  "html", "css", "javascript", "typescript", "react", "vue", "angular", "next.js", "svelte",
  "redux", "state management", "rest", "graphql", "responsive design", "accessibility", "testing",
  "webpack", "tailwind", "figma", "accessibility",
  "node.js", "express", "django", "flask", "spring", "java", "python", "go", "rust", "c#", "php",
  "api", "microservices", "graphql", "authentication", "authorization", "jwt", "oauth",
  "postgresql", "mysql", "mongodb", "redis", "sql", "nosql", "database", "kafka", "rabbitmq",
  "docker", "kubernetes", "terraform", "ansible", "aws", "gcp", "azure", "ci/cd", "jenkins",
  "linux", "bash", "git", "devops", "monitoring", "prometheus", "grafana",
  "pandas", "numpy", "matplotlib", "seaborn", "machine learning", "deep learning", "pytorch",
  "tensorflow", "scikit-learn", "statistics", "tableau", "power bi", "excel", "etl", "dbt",
  "spark", "airflow", "data warehouse", "data modeling", "nlp", "llm", "mlops",
  "siem", "splunk", "threat detection", "incident response", "penetration testing",
  "vulnerability", "firewall", "iam", "compliance", "cve", "forensics", "malware",
  "selenium", "playwright", "cypress", "cypress", "test automation", "junit", "appium",
  "android", "ios", "kotlin", "swift", "flutter", "react native", "mobile",
  "communication", "leadership", "project management", "stakeholder", "agile", "scrum",
];

/** Experience levels we recognise, ordered weakest to strongest. */
export const EXPERIENCE_LEVELS = {
  student: 1,
  entry: 1,
  fresher: 1,
  junior: 1,
  "junior developer": 1,
  intern: 1,
  "career changer": 2,
  associate: 2,
  mid: 2,
  "mid level": 2,
  "mid-level": 2,
  intermediate: 2,
  senior: 3,
  "senior developer": 3,
  lead: 4,
  principal: 4,
  staff: 4,
  manager: 4,
  executive: 4,
};

/** Normalise a free-text experience value ("3 years of React", "junior") to a level. */
export function resolveExperienceLevel(experience) {
  const raw = Array.isArray(experience) ? experience.join(" ") : String(experience || "");
  const value = raw.toLowerCase();

  for (const [name, level] of Object.entries(EXPERIENCE_LEVELS)) {
    if (value.includes(name)) return { level, label: name };
  }

  const years = value.match(/(\d+)\s*\+?\s*(year|yr|years|yrs)/);
  if (years) {
    const count = Number.parseInt(years[1], 10);
    const level = count >= 7 ? 4 : count >= 4 ? 3 : count >= 2 ? 2 : 1;
    return { level, label: `${count}+ years` };
  }

  return { level: 2, label: "unspecified" };
}

/** Canonical key for a role, or null when the catalog does not cover it. */
export function resolveRoleKey(role) {
  if (!role) return null;
  const value = String(role).trim().toLowerCase();
  if (!value) return null;

  if (CAREER_ROLE_REQUIREMENTS[value]) return value;

  for (const [key, definition] of Object.entries(CAREER_ROLE_REQUIREMENTS)) {
    if (definition.aliases.some((alias) => value === alias || value.includes(alias))) return key;
    if (value.includes(definition.title.toLowerCase())) return key;
  }

  // Fall back to keyword scoring against the aliases, e.g. "senior cyber security analyst".
  let best = null;
  let bestScore = 0;
  for (const [key, definition] of Object.entries(CAREER_ROLE_REQUIREMENTS)) {
    let score = 0;
    for (const alias of definition.aliases) {
      const tokens = alias.split(/[^a-z0-9+#.]+/).filter(Boolean);
      if (tokens.length && tokens.every((token) => value.includes(token))) score += tokens.length;
    }
    const titleTokens = definition.title.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
    if (titleTokens.every((token) => value.includes(token))) score += titleTokens.length;
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}

/** Human label for a role key, e.g. "cybersecurity" -> "Cybersecurity Analyst". */
export function roleTitle(roleKey) {
  return CAREER_ROLE_REQUIREMENTS[roleKey]?.title || "General Professional";
}

export default {
  CAREER_ROLE_REQUIREMENTS,
  SKILL_ALIASES,
  JD_SKILL_HINTS,
  EXPERIENCE_LEVELS,
  resolveRoleKey,
  resolveExperienceLevel,
  roleTitle,
};
