// Local mock AI generators. Simulate latency + occasional failure for retry demo.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function simulate<T>(producer: () => T, minMs = 500, maxMs = 1200, failRate = 0): Promise<T> {
  await delay(minMs + Math.random() * (maxMs - minMs));
  if (Math.random() < failRate) throw new Error("Simulated transient error");
  return producer();
}

export async function generateEmail(opts: {
  recipient: string;
  tone: string;
  context: string;
}) {
  return simulate(() => {
    const { recipient, tone, context } = opts;
    const subject =
      tone === "Urgent"
        ? `[Action Needed] ${context.slice(0, 50)}`
        : tone === "Persuasive"
        ? `An opportunity worth your attention`
        : `Following up: ${context.slice(0, 50)}`;
    const greeting =
      tone === "Informal" ? `Hi ${recipient.split(" ")[1] || "there"},` : `Dear ${recipient},`;
    const body = `${greeting}

I hope this message finds you well. I'm writing regarding the following:

${context
  .split(/\n|•|-/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => `• ${l}`)
  .join("\n")}

${
  tone === "Persuasive"
    ? "I believe this represents a strong opportunity and would value your perspective."
    : tone === "Urgent"
    ? "Given the time-sensitive nature, your prompt response would be greatly appreciated."
    : "Please let me know your thoughts at your earliest convenience."
}

Best regards,
[Your Name]`;
    return { subject, body };
  });
}

export async function summarizeMeeting(notes: string) {
  return simulate(() => {
    const sentences = notes
      .split(/[.!?\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
    const keyPoints = sentences.slice(0, 5);
    const decisions = sentences.filter((s) => /decid|agree|approve|will/i.test(s)).slice(0, 3);
    const actions = sentences.filter((s) => /will|todo|action|assign|owner|do /i.test(s)).slice(0, 4);
    return {
      keyPoints: keyPoints.length ? keyPoints : ["Discussion held on project status."],
      decisions: decisions.length ? decisions : ["Continue with current approach."],
      actions: (actions.length ? actions : ["Team to follow up next week."]).map((a, i) => ({
        owner: ["Alice", "Bob", "Carol", "Team"][i % 4],
        task: a,
      })),
      deadlines: ["End of week: progress check-in", "Next Monday: deliverables review"],
    };
  }, 700, 1500);
}

export interface Task {
  name: string;
  priority: "High" | "Medium" | "Low";
  deadline: string;
}

export async function planTasks(tasks: Task[]) {
  return simulate(() => {
    const score = (t: Task) =>
      (t.priority === "High" ? 3 : t.priority === "Medium" ? 2 : 1) +
      (t.deadline
        ? Math.max(0, 3 - Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000 / 2))
        : 0);
    const sorted = [...tasks].sort((a, b) => score(b) - score(a));
    const matrix = {
      urgentImportant: sorted.filter((t) => t.priority === "High"),
      notUrgentImportant: sorted.filter((t) => t.priority === "Medium"),
      urgentNotImportant: sorted.filter((t) => t.priority === "Low" && t.deadline),
      neither: sorted.filter((t) => t.priority === "Low" && !t.deadline),
    };
    const top3 = sorted.slice(0, 3);
    const blocks = top3.map((t, i) => ({
      time: `${9 + i * 2}:00 – ${11 + i * 2}:00`,
      task: t.name,
    }));
    return { matrix, top3, blocks };
  });
}

export async function researchAnalyze(input: string, mode: "summarize" | "explain") {
  return simulate(
    () => {
      const topic = mode === "explain" ? input : input.slice(0, 80);
      return {
        summary:
          mode === "summarize"
            ? `The text covers ${topic}... Core argument centers on practical application and measurable outcomes across the discussed domain.`
            : `${topic} refers to a concept that combines theory and practice, widely applied in modern workplace contexts to drive efficiency.`,
        insights: [
          `📈 Adoption is accelerating across knowledge-worker functions.`,
          `🧠 Successful use depends on clear scoping and human review loops.`,
          `🔗 Integration with existing workflows outperforms standalone deployments.`,
        ],
        recommendations: [
          `🎯 Start with one narrow workflow and measure time saved.`,
          `🛡️ Establish a lightweight review process before scaling.`,
        ],
        limitations: `⚠️ Findings are general; validate with domain-specific sources before acting.`,
      };
    },
    600,
    1400,
    0.1, // simulate occasional failure to exercise retry
  );
}

export async function chatReply(history: { role: "user" | "assistant"; content: string }[]) {
  return simulate(() => {
    const last = history[history.length - 1]?.content || "";
    const lower = last.toLowerCase();
    if (!/work|task|email|meeting|team|project|report|plan|deadline|manage|productiv|ai|research|colleg|office|client/.test(lower) && last.length > 3) {
      return "I'm focused on workplace productivity 🙂 — happy to help with emails, meetings, tasks, or research. Could you rephrase your question in that context?";
    }
    if (/email/.test(lower)) return "📧 Sure — share the recipient, tone, and a few bullet points and I'll draft it. You can also use the Email tab for a full template.";
    if (/plan|day|task/.test(lower)) return "✅ Let's plan your day. List your top tasks with priority and deadlines, and I'll suggest an order with time blocks.";
    if (/summar|meeting/.test(lower)) return "📝 Paste your meeting notes in the Meetings tab and I'll extract key points, decisions, and action items.";
    if (/explain|what is|how does/.test(lower)) return "🔬 Good question. Use the Research tab for a structured breakdown, or give me more context here and I'll explain briefly.";
    return "Got it 👍 — I can help with emails, meetings, tasks, or research. What outcome are you aiming for?";
  }, 400, 900);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry: (attempt: number) => void,
  retries = 3,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      onRetry(i + 1);
      await delay(1000 * Math.pow(2, i));
    }
  }
  throw new Error("unreachable");
}
