import type { Locale } from "./site.ts";

type Localized = Record<Locale, string>;

interface TechnologyGroup {
  title: Localized;
  technologies: readonly string[];
  familiarWith?: readonly string[];
  description?: Localized;
}

interface EngineeringDirection {
  id: string;
  projectSlug: string;
  title: Localized;
  subtitle: Localized;
  description: Localized;
  highlights: readonly string[];
  groups: readonly TechnologyGroup[];
}

export const engineeringHero = {
  subtitle: {
    en: "Building Intelligent Applications and Reliable Software Systems.",
    zh: "智能应用开发与可靠软件系统工程。",
  },
  description: {
    en: "My engineering interests focus on two areas: AI Agent Development and Frontend & Backend Development.",
    zh: "我的工程实践主要围绕两个方向展开：智能体开发，以及前端与后端开发。",
  },
};

export const familiarity: Localized = { en: "Familiar with", zh: "了解" };

export const engineeringDirections: readonly EngineeringDirection[] = [
  {
    id: "agent-development",
    projectSlug: "agent-intent-routing",
    title: { en: "Agent Development", zh: "智能体开发" },
    subtitle: {
      en: "LLM Applications · RAG · Multi-Agent Systems",
      zh: "大语言模型应用 · 检索增强生成 · 多智能体系统",
    },
    description: {
      en: "Design and develop LLM-powered applications and intelligent agent workflows, covering intent understanding, knowledge retrieval, multi-agent orchestration, dynamic skill management, and automated evaluation.",
      zh: "围绕大语言模型应用与智能体工作流开展开发，涵盖意图理解、知识检索、多智能体协作、动态技能管理及自动化评测。",
    },
    highlights: ["Python", "RAG", "Multi-Agent Systems", "Agent Evaluation"],
    groups: [
      {
        title: { en: "Programming & Frameworks", zh: "编程语言与框架" },
        technologies: ["Python", "FastAPI", "Claude", "DeepSeek API"],
      },
      {
        title: { en: "LLM & Agent Technologies", zh: "大语言模型与智能体技术" },
        technologies: [
          "Prompt Engineering", "Few-shot Learning", "Function Calling", "Structured Output",
          "Context Management", "Agent Workflow", "Multi-Agent Collaboration", "Intent Recognition",
          "Intent Routing", "MCP", "Dynamic Skills",
        ],
        familiarWith: ["LangChain", "LangGraph"],
      },
      {
        title: { en: "RAG & Knowledge Retrieval", zh: "RAG 与知识检索" },
        technologies: [
          "ChromaDB", "Document Chunking", "Embedding", "Vector Search", "Query Rewriting",
          "Hybrid Retrieval", "Rerank", "Top-K Retrieval",
        ],
      },
      {
        title: { en: "Agent Evaluation", zh: "智能体评测" },
        technologies: [
          "Accuracy", "Macro-F1", "LLM-as-Judge", "Rule-based Validation",
          "Regression Testing", "End-to-End Evaluation",
        ],
      },
      {
        title: { en: "Supporting Technologies", zh: "配套技术" },
        technologies: ["Redis", "Docker", "Prometheus"],
      },
    ],
  },
  {
    id: "frontend-backend-development",
    projectSlug: "go-backend-services",
    title: { en: "Frontend & Backend Development", zh: "前端与后端开发" },
    subtitle: {
      en: "Web Development · Go Backend · Microservices",
      zh: "Web 前端开发 · Go 后端开发 · 微服务架构",
    },
    description: {
      en: "Develop frontend interfaces and backend services, with experience in web development, Go microservices, API integration, database and middleware systems, and service observability.",
      zh: "具备前端页面开发与后端服务开发能力，涉及 Web 页面交互、Go 微服务架构、API 接口集成、数据库与中间件，以及服务可观测性。",
    },
    highlights: ["HTML", "CSS", "JavaScript", "Go", "Microservices"],
    groups: [
      {
        title: { en: "Frontend Development", zh: "前端开发" },
        technologies: ["HTML", "CSS", "JavaScript"],
        description: {
          en: "Web Interface Development, UI Structure, Styling, Interactive Components, and Frontend-Backend API Integration.",
          zh: "Web 页面开发、页面结构设计、样式调整、交互功能实现及前后端接口联调。",
        },
      },
      {
        title: { en: "Backend Development", zh: "后端开发" },
        technologies: [
          "Go", "Python", "Kratos", "Go-zero", "Gin", "FastAPI", "gRPC", "Protobuf", "Wire",
          "Etcd", "Nacos", "RESTful API", "SSE", "WebSocket",
        ],
        description: {
          en: "Backend Service Development, Microservice Architecture, API Design, Dependency Injection, Service Communication, and Asynchronous Processing.",
          zh: "后端服务开发、微服务架构设计、API 接口设计、依赖注入、服务间通信及异步处理。",
        },
      },
      {
        title: { en: "Database & Middleware", zh: "数据库与中间件" },
        technologies: ["MySQL", "TiDB", "Redis", "Kafka", "Elasticsearch", "Canal"],
        description: {
          en: "Relational Database Management, Cache Design, Message Queue Integration, and Data Synchronization.",
          zh: "关系型数据库、缓存设计、消息队列集成及数据同步。",
        },
      },
      {
        title: { en: "DevOps & Observability", zh: "DevOps 与可观测性" },
        technologies: ["Docker", "Git", "Prometheus", "Grafana", "Jaeger", "OpenTelemetry"],
        familiarWith: ["Kubernetes"],
        description: {
          en: "Containerization, Service Monitoring, Distributed Tracing, Logging, and Performance Diagnostics.",
          zh: "容器化部署、服务监控、分布式链路追踪、日志管理及性能诊断。",
        },
      },
    ],
  },
];
