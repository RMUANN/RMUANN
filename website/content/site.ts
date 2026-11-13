export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export type PageKey = "about" | "research" | "publications" | "projects" | "experience" | "contact";

interface Summary {
  title: string;
  description: string;
}

export interface Publication extends Summary {
  rank: string;
  venue?: string;
  year?: number;
  status?: string;
  role?: string;
  authors?: string;
  href?: string;
  projectSlug?: string;
  image?: { src: string; width: number; height: number; alt: string };
}

interface Project extends Summary {
  slug: string;
  category: string;
  sections: { title: string; body: string }[];
  href?: string;
}

interface SiteContent {
  name: string;
  role: string;
  tagline: string;
  intro: string;
  nav: Record<PageKey, string>;
  pages: Record<PageKey, Summary>;
  themes: Summary[];
  publications: Publication[];
  projects: Project[];
  engineering: Summary[];
  contact: { label: string; href: string }[];
}

const comotionTitle = "CoMotion: A Real-Time System for User-Driven Semantic Steering in Text-to-Motion Generation";
const demoTitle = "CoMotion Demo: Demonstrating User-Driven Semantic Steering in Text-to-Motion Generation";
const sandtouchTitle = "SandTouch: Empowering Virtual Sand Art in VR with AI Guidance and Emotional Relief";
const sandtouchAuthors = "Long Liu, Junbin Ren, Zeyuan Fan, Chenhui Li, Gaoqi He, Changbo Wang, Yang Gao, Chen Li";
const sandtouchDoi = "https://doi.org/10.1145/3706598.3714275";
const vcapTitle = "vCapTouch: Interactive Touch Sensing Data Synthesis for Hand Gesture Recognition Based on Digital Twin";
const vcapAuthors = "Chengshuo Xia, Qingyuan Peng, Zeyuan Fan, Tian Min, Daxing Zhang, Congsi Wang";
const attributeTitle = "Optimizing Attribute Reduction in Multi-Granularity Data through a Hybrid Supervised–Unsupervised Model";
const figures = {
  comotion: { src: "/papers/comotion.webp", width: 1360, height: 502 },
  demo: { src: "/papers/comotion-demo.webp", width: 1360, height: 822 },
  sandtouch: { src: "/papers/sandtouch.webp", width: 1361, height: 567 },
};
const github = { label: "GitHub", href: "https://github.com/RMUANN" };

export const site: Record<Locale, SiteContent> = {
  en: {
    name: "Zeyuan Fan",
    role: "HCI Researcher · AI Engineer",
    tagline: "Interfaces for shaping generated motion",
    intro: "I study how people steer generative systems and build the interfaces and services that make those interactions possible.",
    nav: { about: "About", research: "Research & Publications", publications: "Publications", projects: "Engineering Practice", experience: "Experience", contact: "Contact" },
    pages: {
      about: { title: "About", description: "My work spans human–computer interaction, generative motion, and AI engineering." },
      research: { title: "Research & Publications", description: "How can people express what they want from a generative system, adjust its behavior, and judge the result?" },
      publications: { title: "Publications", description: "Peer-reviewed work on controllable text-to-motion generation and virtual sand art." },
      projects: { title: "Engineering Practice", description: "Selected engineering work in AI agents and backend services." },
      experience: { title: "Experience", description: "Hands-on work in backend systems and AI agents." },
      contact: { title: "Contact", description: "Find me on GitHub for research and engineering collaboration." },
    },
    themes: [
      { title: "Controllable text-to-motion", description: "Use language to describe a motion and give people a way to tune its constituent actions." },
      { title: "Interactive motion editing", description: "Make the effect of an edit visible through controls, playback, and side-by-side comparisons." },
      { title: "Human–computer interaction", description: "Study how people express intent, evaluate generated results, and decide when to intervene." },
      { title: "Immersive creative tools", description: "Use gestures and sound to support hands-on creative work in virtual environments." },
      { title: "Agent-assisted interaction", description: "Explore how agents infer intent and provide context-sensitive guidance in creative and task-oriented workflows." },
    ],
    publications: [
      { title: comotionTitle, rank: "CCF B", venue: "ISS", year: 2026, status: "Accepted", role: "First author", description: "A text-to-motion system with adjustable action-level controls and a study of how people use them.", projectSlug: "comotion", image: { ...figures.comotion, alt: "CoMotion workflow from a text prompt to action-level adjustment of the generated motion" } },
      { title: demoTitle, rank: "CCF A", venue: "UbiComp / ISWC Demo", year: 2026, status: "Accepted", role: "First author", description: "A hands-on demonstration of semantic steering, visual comparison, and saving generated motions.", projectSlug: "comotion", image: { ...figures.demo, alt: "CoMotion Demo interaction steps for adjusting and comparing generated motions" } },
      { title: sandtouchTitle, rank: "CCF A", venue: "CHI", year: 2025, status: "Accepted", role: "Second student author", authors: sandtouchAuthors, description: "A VR sand painting system combining hand gestures, realistic sound, and contextual AI guidance.", projectSlug: "sandtouch", href: sandtouchDoi, image: { ...figures.sandtouch, alt: "SandTouch virtual reality setup, hand gestures, and AI guidance during sand painting" } },
      { title: vcapTitle, rank: "SCI Q2", venue: "IEEE Internet of Things Journal", year: 2025, status: "Accepted", role: "Second student author", authors: vcapAuthors, description: "A digital twin for synthesizing touch sensing data for hand gesture recognition.", href: "https://doi.org/10.1109/JIOT.2025.3553561" },
      { title: attributeTitle, rank: "SCI Q3", venue: "Mathematics", year: 2024, status: "Accepted", role: "First author", description: "A hybrid supervised and unsupervised model for attribute reduction in multi-granularity data.", href: "https://doi.org/10.3390/math12101434" },
    ],
    projects: [
      {
        slug: "comotion", title: "CoMotion", category: "Text-to-motion",
        description: "An interactive system for steering text-to-motion generation with action-level controls.",
        sections: [
          { title: "Why action-level controls?", body: "A prompt can describe several actions at once. CoMotion gives people controls for the actions represented in the system so they can adjust the emphasis of a specific movement while refining a generated sequence." },
          { title: "Semantic steering pipeline", body: "The system matches the text to atomic motion concepts and exposes the matches as adjustable controls. After the first generation, an action-level setting guides replacement of selected tokens in a discrete latent sequence. A decoder reconstructs the updated motion for inspection." },
          { title: "Interaction and comparison", body: "Users enter a prompt, adjust the strengths of matched actions, and compare generated motions in a three-view interface. The demo also lets them save a result." },
          { title: "Evaluation", body: "The model evaluation used 500 prompt–target motion pairs and examined latent alignment, diversity, and FID. In a separate within-participant study, 12 participants compared two conditions across five tasks. Task time covered generation, network latency, and user interaction. Condition order and learning effects matter when interpreting the comparisons." },
        ],
      },
      {
        slug: "sandtouch", title: "SandTouch", category: "Virtual reality",
        description: "A VR sand painting system with hand gestures, realistic sound, and contextual AI guidance.",
        href: sandtouchDoi,
        sections: [
          { title: "Design problem", body: "Physical sand painting requires specialized equipment and takes practice. SandTouch explores how to make the medium accessible in VR while preserving the gestures and feedback that shape the experience." },
          { title: "Interaction and system", body: "Hand tracking and gesture recognition let users manipulate virtual sand directly. Sound accompanies the interaction, and an AI agent interprets ongoing activity to offer contextually relevant artistic suggestions." },
          { title: "Evaluation", body: "The CHI study reports increased engagement and immersion with the system and examines how realistic sound affects the painting experience and users’ reported emotional relief." },
        ],
      },
      {
        slug: "agent-intent-routing", title: "Agent Intent Routing", category: "AI engineering",
        description: "Intent recognition, retrieval, and routing for agent workflows.",
        sections: [
          { title: "Intent and routing", body: "I combined signals from few-shot LLM classification, embedding similarity, and keyword patterns. A weighted decision returned a structured intent with entities and confidence signals, allowing the workflow to ask for clarification when the evidence was weak." },
          { title: "Retrieval and orchestration", body: "An intent gate triggered retrieval only when useful. The workflow rewrote questions into complementary queries, retrieved in parallel from ChromaDB, and merged, deduplicated, and reranked the results before passing context to agents." },
          { title: "Evaluation", body: "I built checks for both intent classification and answer quality. Accuracy and macro-F1 tracked classification, while structured answer reviews made it possible to compare relevance, completeness, and correctness against a baseline." },
        ],
      },
      {
        slug: "go-backend-services", title: "Go Backend Services", category: "Backend engineering",
        description: "Migration and integration work on layered Go services.",
        sections: [
          { title: "Service architecture", body: "I worked on a migration to Go and Kratos. The controller handled request and response adaptation, the business layer held rules, and the data layer owned persistence. Protobuf described service contracts and Wire made construction dependencies explicit." },
          { title: "Integration and lifecycle", body: "The migration preserved existing HTTP calling patterns and brought Redis and Kafka into the new service structure. I examined error propagation, acknowledgement timing, configuration initialization, and resource shutdown." },
          { title: "Observability", body: "I traced how context passed between Gin middleware and the service framework and examined trace continuity across HTTP and database calls. The work connected service integration with logs, metrics, and OpenTelemetry traces." },
        ],
      },
    ],
    engineering: [
      { title: "AI Agent Development", description: "Multi-path intent recognition, agent routing, RAG with ChromaDB, and evaluation." },
      { title: "Backend Development", description: "Go and Kratos microservices, Protobuf, Wire, Redis, Kafka, and observability." },
    ],
    contact: [github],
  },
  zh: {
    name: "范泽远",
    role: "人机交互研究者 · AI 工程师",
    tagline: "为可控的动作生成设计交互界面",
    intro: "我研究人如何引导生成式系统，并开发支撑这些交互的界面与服务。",
    nav: { about: "关于", research: "科研论文", publications: "论文", projects: "工程实践", experience: "经历", contact: "联系" },
    pages: {
      about: { title: "关于", description: "我的工作涉及人机交互、动作生成与 AI 工程。" },
      research: { title: "科研论文", description: "人如何向生成式系统表达意图、调整生成过程，并判断结果是否符合预期？" },
      publications: { title: "论文", description: "关于可控文本到动作生成与虚拟沙画的同行评审成果。" },
      projects: { title: "工程实践", description: "智能体与后端服务的工程案例。" },
      experience: { title: "经历", description: "后端系统与智能体开发实践。" },
      contact: { title: "联系", description: "欢迎通过 GitHub 交流科研和工程合作。" },
    },
    themes: [
      { title: "可控文本到动作生成", description: "用自然语言描述动作，并让用户能够调整其中各个动作的表现。" },
      { title: "交互式动作编辑", description: "通过调节控件、播放和并列比较，让用户看到编辑带来的变化。" },
      { title: "人机交互", description: "研究用户如何表达意图、判断生成结果并选择介入时机。" },
      { title: "沉浸式创作工具", description: "用手势和声音支持虚拟环境中的动手创作。" },
      { title: "智能体辅助交互", description: "探索智能体如何在创作和任务流程中识别意图，并根据上下文提供引导。" },
    ],
    publications: [
      { title: comotionTitle, rank: "CCF B", venue: "ISS", year: 2026, status: "已录用", role: "第一作者", description: "介绍具有动作级调节功能的文本到动作生成系统，并研究用户如何使用这些控件。", projectSlug: "comotion", image: { ...figures.comotion, alt: "CoMotion 从输入文本到按动作调整生成结果的流程" } },
      { title: demoTitle, rank: "CCF A", venue: "UbiComp / ISWC Demo", year: 2026, status: "已录用", role: "第一作者", description: "演示如何调节动作语义、对比生成结果和保存动作。", projectSlug: "comotion", image: { ...figures.demo, alt: "CoMotion Demo 中调节和比较生成动作的交互步骤" } },
      { title: sandtouchTitle, rank: "CCF A", venue: "CHI", year: 2025, status: "已录用", role: "学生第二作者", authors: sandtouchAuthors, description: "结合手势、拟真声音与上下文 AI 引导的 VR 沙画系统。", projectSlug: "sandtouch", href: sandtouchDoi, image: { ...figures.sandtouch, alt: "SandTouch 的虚拟现实设备、沙画手势与 AI 创作引导" } },
      { title: vcapTitle, rank: "SCI 二区", venue: "IEEE Internet of Things Journal", year: 2025, status: "已录用", role: "学生第二作者", authors: vcapAuthors, description: "通过数字孪生合成触觉传感数据，用于手势识别。", href: "https://doi.org/10.1109/JIOT.2025.3553561" },
      { title: attributeTitle, rank: "SCI 三区", venue: "Mathematics", year: 2024, status: "已录用", role: "第一作者", description: "将监督与无监督方法结合，用于多粒度数据的属性约简。", href: "https://doi.org/10.3390/math12101434" },
    ],
    projects: [
      {
        slug: "comotion", title: "CoMotion", category: "文本到动作生成",
        description: "通过动作级控件引导文本到动作生成的交互系统。",
        sections: [
          { title: "为什么需要动作级控件？", body: "一条提示词可以同时描述多个动作。CoMotion 把系统识别到的动作呈现为控件，让用户在调整生成序列时改变某个动作的表现强度。" },
          { title: "语义控制流程", body: "系统将文本与原子动作概念匹配，并将匹配结果呈现为可调节的控件。首次生成后，动作级设置引导系统替换离散潜在序列中的部分 Token，再由解码器重建动作供用户查看。" },
          { title: "交互与比较", body: "用户输入提示词，调节匹配动作的强度，再通过三视图界面比较生成动作。演示系统还支持保存结果。" },
          { title: "评估", body: "模型评估使用 500 组提示词与目标动作配对，分别考察潜在空间对齐、多样性与 FID。另一项被试内研究邀请 12 名参与者在五项任务中比较两种条件。任务用时包含生成、网络延迟和用户操作。解读条件间差异时还需考虑条件顺序和学习效应。" },
        ],
      },
      {
        slug: "sandtouch", title: "SandTouch", category: "虚拟现实",
        description: "融合手势、拟真声音与上下文 AI 引导的 VR 沙画系统。",
        href: sandtouchDoi,
        sections: [
          { title: "设计问题", body: "实体沙画需要专用设备，也需要练习。SandTouch 探索如何在虚拟环境中降低体验门槛，同时保留影响沙画体验的动作与反馈。" },
          { title: "交互与系统", body: "系统通过手部追踪和手势识别让用户直接操控虚拟沙粒，并为操作提供声音反馈。AI 智能体根据当前交互理解创作意图，给出与上下文相关的创作建议。" },
          { title: "评估", body: "CHI 论文报告了用户参与感和沉浸感的提升，并考察拟真声音对创作体验及用户自我报告的情绪缓解感受的影响。" },
        ],
      },
      {
        slug: "agent-intent-routing", title: "智能体意图路由", category: "AI 工程",
        description: "智能体工作流中的意图识别、检索与路由。",
        sections: [
          { title: "意图识别与路由", body: "我融合大模型少样本分类、向量相似度和关键词模式三路信号，通过加权决策输出结构化意图、实体和置信信号。证据较弱时，工作流会向用户澄清需求。" },
          { title: "检索与编排", body: "工作流根据意图决定是否检索，将问题改写为语义互补的子查询，并行召回 ChromaDB。结果合并、去重和重排后，再作为上下文传给智能体。" },
          { title: "评测", body: "我为意图分类和回复质量构建了评测流程。分类使用准确率和宏平均 F1，回复使用结构化评审，对照基线检查相关性、完整性和准确性。" },
        ],
      },
      {
        slug: "go-backend-services", title: "Go 后端服务", category: "后端工程",
        description: "分层 Go 服务的迁移与集成实践。",
        sections: [
          { title: "服务架构", body: "我参与将服务迁移至 Go 与 Kratos。控制层负责请求和响应适配，业务层维护规则，数据层负责持久化。服务契约用 Protobuf 描述，组件依赖用 Wire 装配。" },
          { title: "集成与生命周期", body: "迁移兼容现有 HTTP 调用方式，并将 Redis 和 Kafka 接入新结构。我梳理了错误传递、消息确认时机、配置初始化和资源退出。" },
          { title: "可观测性", body: "我检查了 Gin 中间件与服务框架间的上下文传递，以及从 HTTP 到数据库调用的追踪连续性，并将日志、指标和 OpenTelemetry 链路接入服务。" },
        ],
      },
    ],
    engineering: [
      { title: "智能体开发", description: "多路意图识别、智能体路由、基于 ChromaDB 的检索增强生成与评测。" },
      { title: "后端开发", description: "Go 与 Kratos 微服务、Protobuf、Wire、Redis、Kafka 与可观测性。" },
    ],
    contact: [github],
  },
};
