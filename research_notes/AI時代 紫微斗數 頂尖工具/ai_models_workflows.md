# AI 時代紫微斗數頂尖工具：模型、工作流、整合、失敗模式、數據研究、產品與法規（2025–2026）

_Research snapshot: 2026-11-19. GitHub star counts and repo dates were pulled from the GitHub REST API on 2026-11-19 and will drift. Items marked "(search summary)" come from search-engine summaries of pages that were not fetched in full or that blocked fetching (403); treat them as weaker evidence. "→ Site" bullets are inferences for the requester's Taiwan iztro + Gemini flash-lite SaaS._

## 1. Which LLMs are strongest for 紫微斗數 reading in 2025–2026, and why?

### Takeaway
No LLM is reliably good at applied 紫微/八字 judgment. On the only public benchmark that includes 紫微 (MingLi-Bench, April 2026), the best general model, Claude Opus 4.6, scored 40% trimmed accuracy on 4-option questions (25% is chance). The top-20 human contestants averaged 53.5%. Rankings also flip between benchmarks: DeepSeek led BaziQA but was near the bottom on MingLi-Bench. The biggest gains come from architecture (precomputed charts, many deterministic tools, a fixed reasoning order) rather than from model brand. A tool-heavy agent beat the best raw LLM by about 10 percentage points.

### Cited Findings
- **MingLi-Bench / Tianfu Agent report (DestinyLinker, shared 2026-04-15), trimmed / overall accuracy:**
  - Human top-20 contestants: 53.5% / 51.88%.
  - **Tianfu Agent: 50.0% / 45.0%.**
  - Claude Opus 4.6: 40.0% / 37.5%.
  - Doubao Seed 2.0 Pro: 36.7% / 37.5%.
  - Gemini 3.1 Pro Preview: 36.7% / 37.5%.
  - Grok-4.2: 36.7% / 35.0%.
  - GPT-5.4: 30.0% / 32.5%.
  - MiniMax M2.7: 30.0% / 30.0%.
  - DeepSeek V3.2: 26.7% / 30.0%.
  - Kimi K2.5: 26.7% / 27.5%.
  - Qwen3.6 Plus: 23.3% / 27.5%.
  - Source: [DestinyLinker report](https://destinylinker.github.io/MingLi-Bench/)
- **MingLi-Bench protocol caveats:**
  - Only 8 cases and 40 questions, all from the 2025 (16th) Global Fortune Teller Competition, which had 3,069 participants.
  - LLM baselines received 八字 and 紫微 charts precomputed with the iztro API, at temperature 0.0.
  - Each model ran 5 independent rounds, and a question counted as correct only if answered correctly in at least 3 of them. The page notes that LLMs still vary across runs.
  - There is no separate 八字 vs 紫微 score.
  - The authors call it an "exploratory technical prototype."
  - Source: [DestinyLinker report](https://destinylinker.github.io/MingLi-Bench/)
- **MingLi-Bench repo** (2,609★, created 2026-04-22): 160 normalized multiple-choice questions (2022–2025) across 12 life aspects.
  - The README recommends always passing `--cot` and `--astro` (inject iztro charts) "so scores reflect reasoning ability rather than date-to-chart conversion accuracy."
  - It offers `--shuffle-options` against position bias and supports OpenRouter, OpenAI, Anthropic, Google, DeepSeek and Doubao.
  - Source: [GitHub](https://github.com/DestinyLinker/MingLi-Bench)
- **Media summary (新智元 via itbear, 2026-05-25):** general models' accuracy "清一色徘徊在23%到40%之間". The agent is about 10 pp above the strongest general model. — [itbear](https://www.itbear.com.cn/html/2026-05/1358684.html)
- **BaziQA-Benchmark** (arXiv 2602.12889, 13 Feb 2026, Jiangxi Chen & Qian Liu; 八字 only):
  - 200 multiple-choice questions from the Global Fortune-teller Competition 2021–2025, with charts precomputed by an external engine.
  - Macro-averaged accuracy: DeepSeek-Chat-V3 36.7%, DeepSeek-R1 34.1%, GPT-5.1-Chat 32.5%, Gemini-2.5-Flash 32.4%, Gemini-3-Pro 32.1% (chance 25%).
  - Models "consistently outperform chance but remain far from saturation."
  - Source: [arXiv HTML](https://arxiv.org/html/2602.12889)
- **"Knowing the Rules, Applying the Rules"** (arXiv 2610.05682, 5 Oct 2026, Jiulin Li & Ping Huang; 八字):
  - 3,000 Chinese multiple-choice questions (14 Theory and 11 Case categories), with a refined set of 2,492.
  - Theory accuracy beats Case accuracy for every system, by 16.60–29.56 pp.
  - Rule-recall categories score high: Twelve Stages 89.10%, Nayin 88.62%.
  - Within Case, Luck Pillars averages 84.62%, but Career is only 36.98% and Family Relations 38.19%.
  - DeepSeek native reasoning raised Theory scores by +6.53 (Flash) and +12.20 (Pro), but moved Case scores by only −3.67 and +1.27.
  - The answer key was generated and verified by models, so the benchmark measures agreement with that key, not predictive validity.
  - Source: [arXiv](https://arxiv.org/abs/2610.05682)
- **iztro author's hosted Ziwei agent docs:** "Non-thinking mode prioritizes speed and can miss or mis-associate details in a complex chart. Use `reasoning: { effort: 'high' }` for cross-palace Ziwei synthesis, multiple fortune layers…" The docs also say deep reasoning "does not guarantee correctness." — [openai-iztro-agents-js README](https://github.com/SylarLong/openai-iztro-agents-js)
- **Latency trade-off for reasoning models (frankfika/ziwei):**
  - The README warns against defaulting to long-chain reasoning models, because thinking tokens share the `max_tokens` budget.
  - Measured example: MiniMax-M3 took 281 s (thinking used 11,967 of 12,496 tokens), while a light-thinking model took 12 s (397 tokens).
  - It recommends fast non-reasoning models such as `deepseek-chat`, and says MiniMax-M2.5 is verified in production at about 17 s to first token.
  - Source: [GitHub](https://github.com/frankfika/ziwei)
- **Mainland user sentiment (2025):** users say DeepSeek R1 "reasons through BaZi elements better than ChatGPT" (ChatGPT also needs a VPN in China). One user reads R1's visible reasoning to check it against historical texts. — [MIT Technology Review, 2025-03-03](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)
- **Taiwan anecdote, Gemini free vs Pro:**
  - A 命理師 friend judged the free Gemini reading wrong: "這 AI 根本搞不懂宮位裡的星宿配置，完全解錯了！"
  - She judged the Gemini Pro reading "大致正確".
  - This is a single, uncontrolled case.
  - Source: [vocus](https://vocus.cc/article/696e2d31fd89780001f57b5b)
- **36氪 / 白鯨出海 (2026-07-08):** the LLMs users actually rely on are ChatGPT, DeepSeek and 豆包. The author's test found ChatGPT's context awareness richer than the AI-native app Moonly's. — [36kr](https://www.36kr.com/p/3885616737054721)

### Inferences
- On a 40-question set, one question is worth 2.5 pp, so a 10 pp spread is 4 questions. The model ranking in MingLi-Bench is mostly noise. DeepSeek's position also reverses between BaziQA and MingLi-Bench. The defensible conclusion is that frontier models are roughly tied and only modestly above chance at applied judgment.
- Models recall rules well (75–89% on theory categories) but fail to apply them (career and family about 37–38%). Reasoning modes help recall more than application. This is the core reason to move application into code.
- Gemini-2.5-Flash scored about the same as Gemini-3-Pro on BaziQA (32.4% vs 32.1%). For prediction-style judgments, a cheap tier is not obviously worse. The iztro docs, however, say non-thinking models drop details when synthesizing across palaces and layers.
- → Site: Gemini flash-lite is defensible for narration and follow-up Q&A if all chart facts and derived relations (三方四正, 飛化, 疊盤) are precomputed server-side. Offer a deeper "完整解盤/深度報告" tier routed to a reasoning model for multi-layer synthesis, keeping latency in mind (281 s vs 12 s).
- → Site: A general chatbot, even a frontier one, receives a pasted or screenshotted chart and composes layers itself, and that composition is exactly where benchmarks show failures. Pre-derived, layer-tagged facts are the site's concrete quality lever.

### Gaps
- There is no public benchmark of Gemini flash-lite on 紫微, no 紫微-only split in MingLi-Bench, and no Taiwan-school (e.g. 中州派, 欽天四化) evaluation.
- No study scores open-ended reading quality. All quantitative evidence is multiple-choice.
- No systematic practitioner blind test was found that compares ChatGPT, Claude, Gemini, DeepSeek, Qwen, Doubao and Kimi on 紫微 specifically.
- The search for "哪個 AI 算紫微最準" found only generic model comparisons.

## 2. Concrete AI workflows used by practitioners and teachers

### Takeaway
Publicly documented practitioner use clusters into five patterns:
- Taiwan teachers using Gemini to read chart images into tables, and to act as a "second-opinion supervisor" next to a human reading.
- Large corpus-building projects over a master's lectures (倪海厦《天紀》), using several LLMs with explicit verification.
- Copy-paste prompt workflows in mainland China, plus a cheap market for prompt templates.
- Well-known figures such as 簡少年 framing AI as a learning accelerator and translator, not a replacement.
- No public, named top master's AI-assisted 定盤 (birth-time rectification) workflow was found.

### Cited Findings
- **蘇芳仕 (Taiwan teacher, vocus salon) course, step 1:** "輸入提示詞，同時附加命盤圖檔，提供AI辨識，建立「紫微流年十二宮位與星曜對照表」" using Gemini. — [vocus article](https://vocus.cc/article/69d072b9fd8978000119fd59); [salon](https://vocus.cc/salon/sufangshih)
- **"Second opinion" workflow:**
  - A user gave Gemini a human 命理師's 2026 advice and asked it to act as "第三方監察官" comparing the two views.
  - The AI flagged 廉貞化忌 as a legal/contract risk; the human gave a warmer read on the 兄弟宮 雙祿.
  - Conclusion: the friend is the motivational coach, the AI is the strategy advisor.
  - Source: [vocus](https://vocus.cc/article/696e2d31fd89780001f57b5b)
- **簡少年 (Taiwan 命理 creator), Think with Google, Aug 2026, Google's *Sega on AI* podcast:**
  - More people now meet 命理 through AI first.
  - Classical texts carry conflicting schools and errors that a model may treat as rules.
  - In an experiment, the same reading was rated "只有五成準" as text but "八成" as voice.
  - "AI 更像是加速你的學習，並放大你學習後的成果，而不是讓沒有知識的人瞬間成為專家".
  - He wants to use AI translation to reach overseas audiences.
  - Source: [Think with Google](https://business.google.com/tw/think/future-of-marketing/ai-fortune-telling-jian-shaonian/)
- **Same 簡少年 page (search summary):** "短期內，AI 會提升服務，但人類對它的信任有限，不會取代實體算命師". — [Think with Google](https://business.google.com/tw/think/future-of-marketing/ai-fortune-telling-jian-shaonian/)
- **倪海厦《天紀》 lecture corpus (Renhuai123 team, completed 2026-11-13):**
  - They read 17 episodes frame by frame: 1,604,675 frames in total.
  - DeepSeek did the frame-level pass (12 frames per window, 133,731 windows).
  - Claude blind-labeled 2,805 referential items by looking at the original frames.
  - Output: 6,413 notes; 14,825 quoted segments, of which 14,824 were found verbatim in the subtitles; 2,613 uncertain items flagged "待核".
  - Stated limits: 42.5% of "這裡/這個" references cannot be resolved, and 64% of chalkboard characters are unreadable.
  - There are 344 public summary points with timestamped links to Bilibili, and a separate set of 1,848 倪師 quotes, each replayable.
  - Source: [GitHub](https://github.com/Renhuai123/ziwei-doushu)
- **Similar knowledge system:** "倪海厦天纪·命理风水知识系統" packages a transcription of the 24 天紀 lessons as Hermes Skill + MCP + API (31★, created 2026-06-05). — [GitHub](https://github.com/jonhnsonzz/nihaisha-tianji)
- **Mainland copy-paste workflow (36氪, 2026-07):**
  - Users generate chart data on a tool site, then paste it with a prompt into a chatbot.
  - They maintain context themselves and "calibrate" by flagging hallucinations over several rounds.
  - A Xiaohongshu "AI 運勢" tutorial sold for ¥1.99, with thousands of copies sold.
  - Source: [36kr](https://www.36kr.com/p/3885616737054721)
- **Prompt craft (MIT Technology Review):** circulating prompts tell the model to act as a BaZi master. Guides recommend narrow queries (one pillar at a time) and qualifiers like "use the Ziping method." — [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)
- **Startup workflow, Fatetell (Levy Cheng):** combines ChatGPT, Claude and Gemini with R1 for reasoning. The team is working to remove the crystal and jewelry recommendations the models produce. — [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)
- **Chart-to-chatbot handoff, 天樞命理Agent (Taiwan coverage):** exports a "盤面提示詞" that users copy into ChatGPT to keep going. — [電腦王阿達](https://www.kocpc.com.tw/archives/587571)
- **Skeptical researcher view (search summary; TNL fetch returned 403):** a 紫微 researcher says even 《紫微斗數全書》 "內容都有不少錯誤或是條件沒寫清楚的部分", so AI cannot replace 命理 at present. — [The News Lens](https://www.thenewslens.com/article/265648)
- **Taiwan industry context (search summary):** citing 財政部 data, 命理服務業 2024 sales were NT$2.9億, up 4.1× in five years, with the industry moving toward 人機協作. — [The News Lens](https://www.thenewslens.com/article/265648)

### Inferences
- Uploading a chart screenshot to a general multimodal chatbot is a mainstream teaching workflow, and it adds a vision-misread error layer (the free-Gemini anecdote).
- → Site: Make "AI 讀的是精確排盤資料，不是截圖" a headline differentiator.
- → Site: A "second-opinion / 第三方監察" mode is a natural premium feature. The user pastes a human master's reading, and the AI checks each claim against the verified chart JSON (supported / unsupported / school-dependent). A general chatbot cannot do this reliably without the exact chart.
- → Site (B2B idea): no public product was found that lets Taiwanese masters generate a draft client report from a verified chart, edit it, and send it. This may be an opening for a 命理師 tier.
- Voice delivery inflated perceived accuracy from 50% to 80% in 簡少年's experiment. That is a conversion lever but ethically double-edged.

### Gaps
- No public AI-assisted 定盤 (rectifying birth time from life events) workflow by a named practitioner was found.
- No documentation was found of named top Taiwan or Hong Kong masters (e.g. 中州派 lineage teachers, large YouTube 紫微 channels) using LLMs for client reports.
- YouTube practitioner tests were not retrieved.
- No 紫微-specific NotebookLM teaching setup was found.

## 3. Integrations: custom GPTs, Claude Projects/skills, NotebookLM, RAG, MCP and function calling

### Takeaway
By late 2026 the dominant pattern is a deterministic engine exposed as a tool, with the LLM narrating only. It ships as MCP servers (stdio or remote Streamable HTTP) and SKILL.md skills for Claude, Codex, Cursor and similar.
- iztro (4,411★) is the de facto 紫微 engine.
- Renhuai123/ziwei-doushu (18,829★) is the most-starred engine plus knowledge base.
- The iztro author now sells a hosted Ziwei agent model.
- GPT Store and NotebookLM setups are barely documented in public.

### Cited Findings
**Engines (stars and created dates as of 2026-11-19)**
- **iztro:** 4,411★, created 2023-07-27, last push 2026-11-18. — [GitHub](https://github.com/SylarLong/iztro)
  - Ports: [react-iztro](https://github.com/SylarLong/react-iztro) 536★; [dart_iztro](https://github.com/EdwinXiang/dart_iztro) 154★; [py-iztro](https://github.com/x-haose/py-iztro) 142★ (created 2025-03-09).
  - [x-iztro](https://github.com/x-haose/x-iztro) (Rust with Python and Go bindings; "field-for-field parity with iztro v2.5.8"): 8★, created 2026-08-12.
- **Renhuai123/ziwei-doushu:** 18,829★, created 2026-05-01. — [GitHub](https://github.com/Renhuai123/ziwei-doushu)
  - Engine based on 倪海厦《天紀》, with a 四化 system, a 格局 knowledge base and 古籍 text data.
  - Licenses: code MIT; dataset CC BY 4.0; 倪師 quotes CC BY-NC-SA.
  - Live site: ouranic.cn.
- **zhenheco/life-chart-engine:** 78★, created 2026-05-31, Traditional Chinese. Combines 西洋星盤, 人類圖 and 紫微斗數 in one engine; offline and deterministic; CLI + JSON "供 AI agent". — [GitHub](https://github.com/zhenheco/life-chart-engine)

**MCP servers (紫微 or multi-system)**
- **ChesterRa/mingpan** (134★, created 2025-12-14):
  - Systems: 八字, 紫微, 六爻, 梅花, 大六壬, 奇門.
  - Positioning: "Deterministic Chinese-metaphysics chart calculator for AI agents… Facts only."
  - Official remote MCP at `https://mingpan.bzwai.com/mcp`, run by BaziWei. It is stateless and does not store birth parameters. A local option is `npx mingpan` (stdio).
  - Source: [GitHub](https://github.com/ChesterRa/mingpan)
- **hhszzzz/taibu** (787★, created 2026-01-04): 命理分析 Agent covering 八字, 紫微 and others; supports MCP and Skills. — [GitHub](https://github.com/hhszzzz/taibu)
- **Brhiza/mingyu** (588★, created 2026-04-02): outputs structured prompts and data; offers a public API, an MCP server and a skill. — [GitHub](https://github.com/Brhiza/mingyu)
- **SiwuXue/ziwei-mcp** (25★, created 2025-07-29). — [GitHub](https://github.com/SiwuXue/ziwei-mcp)
- **smogievogie/ziwei_iztro-mcpserver** (15★, created 2025-08-15): iztro with geocoding and apparent-solar-time conversion (needs a Gaode Maps key). — [GitHub](https://github.com/smogievogie/ziwei_iztro-mcpserver); [LobeHub](https://lobehub.com/pl/mcp/smogievogie-ziwei_iztro-mcpserver)
- **@feida/iztro-mcp-server (kcz):** tools `generate_astrolabe_by_solar`, `get_horoscope_analysis`, `get_palace_info`. — [LobeHub](https://lobehub.com/zh/mcp/kcz-iztro-mcp-server)
- **wuunicorn/MCPIztro:** iztro v2.5.3; solar and lunar input; full JSON chart output. — [LobeHub](https://lobehub.com/mcp/wuunicorn-mcpiztro)
- **PeterYuen/ziwei-mcp** (3★, created 2026-11-05): — [GitHub](https://github.com/PeterYuen/ziwei-mcp)
  - 10 tools over stdio and Streamable HTTP (bearer token).
  - Stateless, "zero LLM inside the server — pure engine math".
  - Vendors the Renhuai123 engine pinned at commit `906bd93`; true-solar-time correction is applied before the engine.
  - Includes a `ziwei_batch_stats` tool; described as "gold-standard regression tested".
- **xjoey1957/ziwei-mcp** (created 2026-10-29): — [GitHub](https://github.com/xjoey1957/ziwei-mcp)
  - Tools: `get_chart` (12 palaces with 干支, brightness, 四化, 空宮借星, 大限), `get_reading_summary`, and `get_twins`, which estimates how many people share the same chart structure.
  - Ships a Claude skill for neutral wording and a "傳統文化參考" closing note; live site zw.tokenxiu.com.
- **listen-hai/ziwei-mcp** (2026-08-20): true solar time, global IANA DST, "explicit school/convention" settings. — [GitHub](https://github.com/listen-hai/ziwei-mcp)
- **bazichart/bazichart-mcp** (2026-11-16): hosted MCP for 八字 and 紫微; "True solar time, explicit conventions, no install." — [GitHub](https://github.com/bazichart/bazichart-mcp)
- **Riki-1124/bazi-ziwei-qimen-paipan-mcp** (3★, 2026-08-05): automatic 真太陽時 from birthplace. — [GitHub](https://github.com/Riki-1124/bazi-ziwei-qimen-paipan-mcp)
- **x-haose/x-ziwei** (2026-10-10): MCP powered by x-iztro. — [GitHub](https://github.com/x-haose/x-ziwei)
- **xmond/yishu-insight-mcp** (2026-10-16): backs insightapp.life. — [GitHub](https://github.com/xmond/yishu-insight-mcp)
- **spyfree/mingli-mcp:** listed on Glama and Apify. — [Glama](https://glama.ai/mcp/servers/@spyfree/mingli-mcp/blob/5a48dad1bffb3c7e683aa17a753006e040ef6034/README.md); [Apify](https://apify.com/spyfree/mingli-mcp)
- **八字-only reference MCPs:** [cantian-ai/bazi-mcp](https://github.com/cantian-ai/bazi-mcp) 435★ (2025-04-27); [openfate-ai/openfate-mcp](https://github.com/openfate-ai/openfate-mcp) 162★.

**Hosted agent API from the iztro author**
- `openai-iztro-agents` (JS repo created 2026-06-27, with a Python sibling) is a thin layer over the OpenAI Agents SDK.
- Hosted models: `iztro-ziwei-v3`, `iztro-ziwei-v3-fast`, `iztro-qimen-v3`, `iztro-qimen-v3-fast`. API keys look like `sk_ziwei_*`.
- Conversation memory is server-side (`ChatSession`); output languages are zh/en/ko/ja/vi.
- The docs say DeepSeek rejects some penalty parameters, which suggests a DeepSeek backend.
- Docs live at api-doc.iztro.com.
- Source: [GitHub](https://github.com/SylarLong/openai-iztro-agents-js)

**Skills (SKILL.md for Claude / Codex / Cursor)**
- **FANzR-arch/Numerologist_skills** (1,840★, created 2026-03-25): "An engineering framework to stop LLM hallucinations in Chinese astrology." — [GitHub](https://github.com/FANzR-arch/Numerologist_skills)
  - Covers 奇門, 紫微 (`ziwei_cli.py`) and 八字.
  - Principles: 先追問再輸出; 確定性計算外包; 先聲明口徑再做結論; 高風險場景不替代專業建議.
- **learnwithu/mingli-master** (789★, created 2026-06-02): 紫微 interpretation skill built on iztro-py, renders an HTML chart. — [GitHub](https://github.com/learnwithu/mingli-master)
- **dzcmemory-web/bazi-ziwei-skills** (132★, created 2026-08-30): — [GitHub](https://github.com/dzcmemory-web/bazi-ziwei-skills)
  - Uses mingpan for 八字 and iztro for 紫微.
  - Design rule: "LLM 只負責分析，不負責排盤和畫 HTML".
  - Its added 格局 layer was regression-checked on 7 cases.
  - Also does 八字 × 紫微 cross-check (綜合印證).
- **Other multi-system skills:** [weizeW/mingli-skills](https://github.com/weizeW/mingli-skills) 101★; [ml8s/liki](https://github.com/ml8s/liki) 105★; [ai-freer/fortune-skill](https://github.com/ai-freer/fortune-skill) 44★.
- **taskyoooo/ziwei-doushu-skill** (47★, 2026-04-16): — [GitHub](https://github.com/taskyoooo/ziwei-doushu-skill)
  - Distilled from 7 texts, including 《紫微斗數全書》(南北山人版), 《紫微斗數精成》 and 顧祥弘《飛星紫微斗數全書》.
  - Installed through Claude.ai Settings → Skills.
  - Rules: 嚴禁編造, 清晰說明依據, 去迷信化, 承認局限, 跨派注明.
- **Linden-TR/ziwei-doushu-skill** (17★, 2026-05-27): — [GitHub](https://github.com/Linden-TR/ziwei-doushu-skill)
  - Uses 中州派 as the primary school, with 三合, 飛星, 欽天四化 and 河洛 as backup.
  - 45 named patterns; a `zhengyan.md` file of "empirical verification signals"; powered by `@mingai/mcp`.
- **Cross-system and multi-agent designs:**
  - [mingli-cross-check](https://github.com/yanyan02102911-code/mingli-cross-check) (43★): cross-checks 八字, 紫微, Indian astrology and modern astrology.
  - [huy555huy/suan](https://github.com/huy555huy/suan) (13★): a 7-agent council, planner-executor loop and a reflective self-check step.

**Open-source full apps (closest to the requester's stack)**
- **ziweiknows/ziwei-chat** (39★, 2026-07-05), companion to ziwei-chart (512★): — [ziwei-chat](https://github.com/ziweiknows/ziwei-chat); [ziwei-chart](https://github.com/ziweiknows/ziwei-chart)
  - Stack: Next.js 16, React 19, iztro.
  - Pipeline: 出生資訊 → iztro 確定性命盤 → 命盤事實與問題路由 → 主題工作流 + 本地/向量知識檢索 → 生成 → **critic 審核與證據輸出**.
  - Rule: "只有確定性工具返回的信息可以被描述為用戶的命盤事實；知識庫用於解釋，不用於補造盤面信息".
  - Generates a palace reading only when the user clicks it, to save tokens; has an evidence panel.
  - Retrieval defaults to local Markdown/keyword search, with optional pgvector; ships an `npm run eval:agent` gate.
- **frankfika/ziwei** (2026-10-31): — [GitHub](https://github.com/frankfika/ziwei)
  - Charting is deterministic. The 13 reading dimensions are retrieved from a 674,976-chart open dataset, not generated.
  - Follow-up chat is grounded, with a "mechanical self-check (palace-placement check + reference star table)".
  - 3 free AI follow-ups per day; unlimited with your own key.
- **JunQHuang/AI-Ziwei-Fortune-Destiny** (7★, 2026-03-26): Next.js 16, TypeScript, iztro, OpenAI API, multi-turn. Essentially the requester's stack. — [GitHub](https://github.com/JunQHuang/AI-Ziwei-Fortune-Destiny)
- **Other apps and frameworks:**
  - [Sudo-Biao/Chinese-Metaphysics-Platform](https://github.com/Sudo-Biao/Chinese-Metaphysics-Platform) (187★): Python engines plus a multi-provider LLM streaming layer.
  - [MokoKing666/MaoMagic](https://github.com/MokoKing666/MaoMagic): fully offline; an on-device Gemma 4 E2B "只負責把結論說成人話".
  - [HedgeLinn/Fortune-Telling v2](https://github.com/HedgeLinn/Fortune-Telling) (八字): three-layer knowledge base (local 古籍 → 《三命通會》 12 卷 → WebSearch) with a source on every conclusion.

**GPT Store and multi-model consumer apps**
- Searches surfaced no well-documented GPT Store 紫微 GPT.
- 玩美 AI Chat (Perfect Corp) bundles ChatGPT 4.1/4o/4o mini, DeepSeek R1, Claude 3.5 Haiku and Claude 4 Sonnet, and claims to be optimized for 紫微 and 八字. — [Perfect Corp blog](https://www.perfectcorp.com/zh-tw/consumer/blog/ai-chat/ai-fortune-telling)

### Inferences
- The requester's architecture (iztro server-side, structured summary sent to an LLM) is now the open-source baseline. Dozens of repos and free sites do the same, so it is not a moat by itself.
- Differentiation has to come from layers above it:
  - Derived-fact tools: 飛化 paths, 自化, 三方四正 sets, multi-layer 四化 overlays.
  - A vetted Traditional Chinese corpus with verbatim 古籍 citations.
  - A critic/validator with a user-visible evidence panel.
  - Evals.
  - Memory of the user's life context.
- Renhuai123's 18.8k stars in about 6 months is unusually high for a niche repo. It may reflect promotion; treat popularity as unverified.
- → Site: A later B2B option is exposing the verified chart and derivations as a remote MCP endpoint for practitioners' own AI tools. mingpan and bazichart already ship hosted MCPs.
- → Site: iztro's hosted `iztro-ziwei-v3` is both a benchmark and a potential competitor or backend. Compare it against the requester's Gemini pipeline on the same charts.

### Gaps
- No GPT Store listings with usage counts, and no documented Claude Projects or NotebookLM setups over 《紫微斗數全書》/《全集》, were found.
- mcp.so and Smithery listings were not individually checked.
- Most repos are Simplified Chinese and mainland-school oriented. Traditional Chinese, Taiwan-school resources are scarce.

## 4. Known failure modes and the mitigations serious builders use

### Takeaway
The main failure modes are:
- The LLM computing the chart itself.
- Wrong inputs, such as birth time and calendar edge cases.
- Impossible 四化 and fabricated classical citations.
- Two-sided hedging and Barnum vagueness.
- Mixing schools or leaving conventions unstated.
- Errors when combining 本命 with 大限 and 流年.
- Answers that change from run to run.
- Sycophancy, fear-mongering and product upsell.

Serious builders respond with:
- Deterministic engines and declared conventions.
- Retrieval of vetted, pre-written readings.
- Validators or critics, with evidence shown to the user.
- Gold-chart regression tests and multi-run evals.
- Many small tools in place of free-form model reasoning.

### Cited Findings
**Failure modes**
- **Self-charting:** "純 LLM 排盤常把日柱、日主、格局算錯，一步錯則全盤失真" (八字, but the same logic applies to 紫微). — [dzcmemory-web/bazi-ziwei-skills](https://github.com/dzcmemory-web/bazi-ziwei-skills)
- **Garbage in:** accuracy drops 20–45% when incorrect BaZi information is supplied. — [arXiv 2510.23337](https://arxiv.org/abs/2510.23337)
- **Errors found in generated 紫微 斷語 (Renhuai123 v4.0, 2026-10-15):**
  - Quotes attributed to 倪師 or 《全書》 that could not be traced were deleted or replaced with verbatim lines.
  - Sentences about impossible 四化 (e.g. **七殺化權, 紫微化忌**) were removed.
  - Conditional 斷語 now state their conditions.
  - Two-sided statements ("力量強時……落陷時……") were rewritten so only the version true for the given chart is shown.
  - Health statements were re-based on a school rule (the 地支 of the palace with the most 煞星) instead of each star's 五行.
  - 古籍引證 grew from 244 to 405, each findable verbatim in 《紫微斗數全書》.
  - Source: [GitHub](https://github.com/Renhuai123/ziwei-doushu)
- **Convention and calendar edge cases (same repo):**
  - 晚子時 day-change is now decided by true solar time.
  - A wrong leap-month parameter now raises an error instead of silently charting.
  - China DST is detected but never auto-deducted.
  - Default star brightness switched to 《斗數全書》, verified against 5 gold-standard charts. The v4.0 dataset was generated under the old default, so some text differs.
  - Source: [GitHub](https://github.com/Renhuai123/ziwei-doushu)
- **Temporal composition:** "systematic failures on precise temporal localization and multi-condition symbolic judgments". Annual-fortune questions are hard for every model, and errors compound across sub-inferences. — [BaziQA](https://arxiv.org/html/2602.12889)
- **Knowing vs applying:** see the theory vs case gaps in Q1. — [arXiv 2610.05682](https://arxiv.org/abs/2610.05682)
- **Inconsistency, hallucination, sycophancy, upsell (科普中國, via 澎湃, 2025-03-23):**
  - "它每次給的答案都不一樣".
  - Readings about past years include "明顯的胡說八道".
  - Generative AI tends to tell users what they want to hear.
  - It recommends red crystals, like human sellers of 轉運物品.
  - The "accuracy" is the Barnum effect.
  - Source: [澎湃](https://m.thepaper.cn/newsDetail_forward_30470842)
- **Fear-mongering and upsell (MIT TR):** one user got a reading forecasting failed marriages, illness and "a stroke at 60". Models often recommend crystals and jewelry; Fatetell attributes this to promotional text in training data. — [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)
- **Positive skew:** "報喜不報憂" in a Gemini test (anecdotal). The author attributes it to RLHF and the Pollyanna principle. — [80aj, 2026-08-02](https://www.80aj.com/2026/08/02/ai-fortune-telling-test/)
- **Run-to-run variance and dropped details:** MingLi-Bench notes LLMs may vary across runs even at temperature 0.0, which is why it scores at least 3 correct out of 5 rounds ([report](https://destinylinker.github.io/MingLi-Bench/)). The iztro docs say non-thinking mode "can miss or mis-associate details in a complex chart" ([README](https://github.com/SylarLong/openai-iztro-agents-js)).
- **Vision misreading:** free Gemini "搞不懂宮位裡的星宿配置" in a chart-reading anecdote. — [vocus](https://vocus.cc/article/696e2d31fd89780001f57b5b)
- **Errors in the source canon itself:** classical texts contain conflicting schools and errors that AI may absorb as rules. — [Think with Google / 簡少年](https://business.google.com/tw/think/future-of-marketing/ai-fortune-telling-jian-shaonian/)

**Mitigations**
- **Engine computes, LLM narrates:**
  - ziwei-chat: "只有確定性工具返回的信息可以被描述為用戶的命盤事實" ([ziwei-chat](https://github.com/ziweiknows/ziwei-chat)).
  - mingpan: "Facts only" ([mingpan](https://github.com/ChesterRa/mingpan)).
  - PeterYuen: "zero LLM inside the server" ([PeterYuen](https://github.com/PeterYuen/ziwei-mcp)).
  - MaoMagic: the on-device LLM only phrases the conclusions ([MaoMagic](https://github.com/MokoKing666/MaoMagic)).
- **Ask before charting; declare conventions first; fix terms and judgment order:**
  - Rules: ask for missing data instead of forcing a chart; state 流派, 換日 rule and 閏月 handling before concluding; keep terminology and judgment order fixed in reference files; push rigid computation to scripts.
  - Source: [FANzR-arch/Numerologist_skills](https://github.com/FANzR-arch/Numerologist_skills)
- **Critic and evidence:**
  - ziwei-chat: a critic review step plus an evidence panel showing tool calls, chart facts, knowledge sources and critic status ([ziwei-chat](https://github.com/ziweiknows/ziwei-chat)).
  - frankfika: a mechanical palace-placement check against a reference star table; the UI says plainly when data is missing instead of inventing content ([frankfika/ziwei](https://github.com/frankfika/ziwei)).
- **Pre-generated, vetted readings instead of free generation:** 13-dimension readings are retrieved from the dataset, and the model only handles optional follow-ups. — [frankfika/ziwei](https://github.com/frankfika/ziwei); [Renhuai123](https://github.com/Renhuai123/ziwei-doushu)
- **Gold-standard regression tests:** "gold-standard regression tested" ([PeterYuen/ziwei-mcp](https://github.com/PeterYuen/ziwei-mcp)); 5 gold charts checked palace by palace ([Renhuai123](https://github.com/Renhuai123/ziwei-doushu)); 7-case regression of the added 格局 layer ([dzcmemory-web](https://github.com/dzcmemory-web/bazi-ziwei-skills)).
- **Structured Reasoning Protocol:** constrains the order of inference without adding domain knowledge. Its effects across models and years are reported as mixed. — [BaziQA](https://arxiv.org/html/2602.12889)
- **Agentic decomposition (Tianfu Agent):**
  - More than 200 atomic tools for computable operations such as chart casting, timing derivation and path traversal.
  - Rules are wrapped as functions with expert-annotated metadata that return confidence scores.
  - Uncertainty is quantified at three levels: tool output, sub-agent self-assessment and multi-school synthesis.
  - Result: about 10 pp above the best raw LLM.
  - Source: [DestinyLinker](https://destinylinker.github.io/MingLi-Bench/)
- **Tone and safety rules in skills:**
  - taskyoooo: 去迷信化, 不恐嚇、不誘導、不誇大 ([taskyoooo](https://github.com/taskyoooo/ziwei-doushu-skill)).
  - xjoey1957: neutral wording and a closing "傳統文化參考" note ([xjoey1957](https://github.com/xjoey1957/ziwei-mcp)).
  - ziwei-chat: medical, legal, investment and urgent questions get reflective, non-substitutive answers only ([ziwei-chat](https://github.com/ziweiknows/ziwei-chat)).
- **Eval hygiene:** shuffle answer options and use multi-round majority scoring. — [MingLi-Bench](https://github.com/DestinyLinker/MingLi-Bench)
- **Unproven small-sample claim (search summary):** a third-party "MingLiSkill" claims 93.3% on MingLi-Bench, but that is 14 of 15 random questions. — [CSDN](https://damodev.csdn.net/6a437fdb10ee7a33f284e888.html)

### Inferences
- → Site: a cheap post-generation validator gives the largest gain for flash-lite. It would:
  - Extract every star, palace, 四化 and 大限/流年 mention from Gemini's answer.
  - Check each against the chart JSON.
  - Hard-block impossible 四化 (e.g. 紫微化忌, 七殺化權) using the 10-天干 四化 table.
  - Regenerate or strip offending sentences.
- → Site: precompute layer-tagged facts in the summary: 生年/大限/流年/流月 四化 with the palace each lands in, 三方四正 star sets, 宮干飛化 and 自化, and 空宮借星. The model then never composes layers, which is the documented weak point.
- → Site: state the school and conventions in both the UI and the prompt: which 四化 table, 晚子時 rule, 閏月 rule, true-solar-time on/off, brightness table. Refuse mixed-school claims, or label them.
- → Site: consistency is a sellable feature. Cache a deterministic base reading per chart (key on the iztro chart hash plus the prompt version), use low temperature, and reserve free generation for follow-ups. This directly answers the "每次答案都不一樣" complaint about general chatbots.
- → Site: run a tone policy plus a classifier, with no doom predictions (death, stroke, divorce dates), no 轉運商品, and explicit health/legal/finance boundaries. Show uncertainty and 同盤人數 for humility.
- → Site: build a Taiwan-school golden set of charts with expert-written key facts. Run nightly evals (fact-precision, forbidden-claim rate, multi-run agreement) and optionally MingLi-Bench with iztro-injected charts as a public yardstick.

### Gaps
- No published measurement was found of how often general LLMs misplace 主星 or mis-assign 四化 when charting 紫微 themselves.
- No hallucination study of Gemini flash-lite on chart JSON input was found.
- No measured effect sizes exist for critics or validators in this domain.

## 5. Data-driven research: 命例庫, statistics/ML, theses, arXiv, 大數據命理

### Takeaway
Rigorous outcome-based evidence is still scarce.
- The most serious Taiwanese statistical work (林聖軒, 陽明交大 統計所) found no demonstrable predictive validity in national social-survey data. Its one significant finding (marital status) was confounded with age.
- The 2025–2026 "datasets" are mostly competition multiple-choice sets scored against official keys, model-generated answer keys, or huge synthetic interpretation corpora. None is an outcome-labeled 命例庫.

### Cited Findings
- **林聖軒 (陽明交大 統計所; studied 紫微) 2020 STS conference paper (older, 2020):**
  - Uses 臺灣地區社會變遷基本調查 data.
  - Only marital status was significant (p < 0.001), and it is highly correlated with age.
  - Conclusion: current data "尚無法證明命理學有預測之準度".
  - (search summary of the PDF) — [PDF](https://shenghsuanlin.web.nycu.edu.tw/wp-content/uploads/sites/349/2022/03/以社會變遷調查資料庫進行統計命理學之實證研究2020STS研討會.pdf)
- **Same team's related papers (older, roughly 2019–2022; search summaries):**
  - 「使用機器學習進行術數量化實證研究設計」 (第十一屆 中華傳統術數文化學術研討會) uses survey items on marriage, education and income as test targets. — [PDF](https://shenghsuanlin.web.nycu.edu.tw/wp-content/uploads/sites/349/2022/03/機器學習進行術數量化。第十一屆【中華傳統術數文化學術研討會】論文集.pdf)
  - A methodology paper on statistical modeling, research design and causal inference. — [PDF](https://shenghsuanlin.web.nycu.edu.tw/wp-content/uploads/sites/349/2022/03/命理學量化研究之模型與方法論第七屆術數研討會論文集.pdf)
  - Development of quantitative indicators and their reliability and validity. — [PDF](https://shenghsuanlin.web.nycu.edu.tw/wp-content/uploads/sites/349/2022/03/中華傳統術數之量化指標發展與信效度分析。第十屆【中華傳統術數文化學術研討會】論.pdf)
  - Design of a higher-education course on quantifying 術數. — [PDF](https://shenghsuanlin.web.nycu.edu.tw/wp-content/uploads/sites/349/2022/03/高等教育中的術數量化課程設計。第十一屆【中華傳統術數文化學術研討會】論文集.pdf)
- **Taiwan theses (search summary):**
  - A 淡江 thesis uses 紫微 charts to analyze smoking tendency, with mixed quantitative and qualitative methods. It is about consumer behavior, not chart validity. — [淡江 ETDS](https://etds.lib.tku.edu.tw/ETDS/Home/Detail/U0002-0207202010434300)
  - A 景文科大 2015 thesis on a cloud implementation of a 紫微 system, and a 佛光 history-of-ideas thesis. — [NDLTD](https://ndltd.ncl.edu.tw/handle/8h5e2q); [NDLTD](https://ndltd.ncl.edu.tw/r/5eq57j)
- **Competition-derived benchmarks:**
  - The Global Fortune Teller Competition (全球算命師大賽, run by HKJFMA, [hkjfma.org](https://hkjfma.org)) is the main source of "ground truth."
  - MingLi-Bench: 160 questions (2022–2025). BaziQA: 200 questions (2021–2025).
  - The 2025 competition had 3,069 participants, and the top 20 humans averaged 53.5%.
  - Sources: [MingLi-Bench](https://github.com/DestinyLinker/MingLi-Bench); [BaziQA](https://arxiv.org/abs/2602.12889); [DestinyLinker report](https://destinylinker.github.io/MingLi-Bench/)
- **arXiv 2610.05682 (八字):** 3,000 items; the key was generated and verified by models; provenance and expert validation are incomplete.
  - A search snippet refers to a "BaZi2500" set on Hugging Face (CC BY-NC 4.0). The abstract instead cites 3,000 and 2,492 items; this discrepancy is unresolved.
  - Source: [arXiv](https://arxiv.org/abs/2610.05682)
- **arXiv 2510.23337** (WordPlay Workshop 2025): BaZi-based persona QA; a "BaZi-LLM" that combines symbolic reasoning with LLMs; +30.3% to +62.6% over DeepSeek-v3 and GPT-5-mini.
  - A search snippet of the PDF also mentions a "Celebrity 50" dataset and 60% on a competition set, matching third place. These details were not verified in the abstract.
  - Source: [arXiv](https://arxiv.org/abs/2510.23337)
- **Synthetic interpretation corpus (Renhuai123 v4.0, 2026-10-15):**
  - 674,976 charts (every real date 1950–2026 × 12 時辰 × 2 genders), each with 13 dimensions, for 8,774,688 passages.
  - About 20.4 billion characters; 56.6 GB uncompressed, 161 MB compressed; licensed CC BY 4.0.
  - The earlier v3.0 had 518,400 charts.
  - Source: [GitHub](https://github.com/Renhuai123/ziwei-doushu)
- **Chart-statistics tooling:** `get_twins` estimates how many people (China or global) share a chart structure ([xjoey1957](https://github.com/xjoey1957/ziwei-mcp)); `ziwei_batch_stats` enumerates days in parallel ([PeterYuen](https://github.com/PeterYuen/ziwei-mcp)).
- **Market-size claims:** 艾媒咨詢 reportedly puts China's 2024 "AI 玄學" market above ¥12 billion. This comes from a commentary and is not verified. — [80aj](https://www.80aj.com/2026/08/02/ai-fortune-telling-controversy/)
- **The open-source project lead's own caution:** 倪師 said 「斗數批六親本來就比較差一點」, which the project flags as a limit of 紫微 for kinship judgments. — [Renhuai123](https://github.com/Renhuai123/ziwei-doushu)

### Inferences
- "大數據命理" in 2025–2026 usually means enumerating every chart and pre-generating text, not linking charts to real outcomes. None of the corpora found validate predictive accuracy.
- → Site: the natal chart space is finite: about 675k date × 時辰 × gender combinations for 1950–2026, as Renhuai123 shows. Precomputing and caching a vetted base reading per chart is feasible. That gives consistency, lower Gemini cost and reviewability, with flash-lite reserved for personalized follow-ups.
- → Site: an opt-in, consented life-event log (de-identified) would create a proprietary outcome dataset. It could support future 定盤 features and honest calibration ("in our users' data, X…"). This is the one real moat general chatbots cannot copy, but it raises 個資法 obligations (see Q7).

### Gaps
- No public, outcome-labeled 紫微 命例庫 with statistical validation was found.
- No 2025–2026 peer-reviewed ML study on 紫微 predictive validity was found.
- The Taiwan thesis database (臺灣博碩士論文知識加值系統) was not queried directly; thesis details come from search summaries.
- No Hugging Face 紫微 datasets or fine-tunes were verified. A repo named DerekCCY/ziwei-fortune-telling-llm exists but has an empty README.

## 6. Notable AI-native 紫微斗數 / Chinese-metaphysics products in 2025–2026

### Takeaway
The early-2025 DeepSeek 算命 wave made general chatbots the default "AI 算命" channel. By 2026 many young users paste prompts into ChatGPT, DeepSeek or 豆包 instead of opening apps.

AI-native products differentiate through:
- iztro-based deterministic charting (nearly universal).
- Freemium chat quotas and VIP or token monetization.
- In Taiwan, legacy portals adding AI (科技紫微網) and free web agents (天樞命理Agent).

The evidence that AI-native apps beat pasting a chart into ChatGPT is weak (the Moonly test).

### Cited Findings
- **DeepSeek wave:**
  - More than 2 million WeChat posts mentioned "DeepSeek 算命" in February 2025.
  - An R1 reading took about 15 seconds; one user had previously paid human tellers up to ¥500 per session.
  - Sources: [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/); [INSIDE](https://www.inside.com.tw/article/37735-deepseek-sparks-online-fortune-telling-trend-in-china)
- **Xiaohongshu and the US market (36kr, 2026-07):**
  - #deepseek算命 has 56.08M views and 354k discussions.
  - Moonly's monthly revenue has hovered around US$100k (Jan 2024–Jun 2026), and its output was no better than a general chatbot in the author's test.
  - Seven major US astrology apps were flat or declining from Dec 2025 to Jun 2026.
  - Source: [36kr](https://www.36kr.com/p/3885616737054721)
- **Fatetell (Levy Cheng):** multi-LLM; a full report costs $39.99; pivoted overseas because of shadow-banning risk in China. — [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)
- **OURANIC (ouranic.cn):**
  - Formerly metisziwei.com; renamed 2026-10-31.
  - Operated by 北京王多魚科技有限責任公司 (京ICP備2026069066號-1).
  - Offers charting, AI interpretation and chart history, built on the open-source engine and dataset.
  - Source: [Renhuai123](https://github.com/Renhuai123/ziwei-doushu)
- **紫微AI (ziweiai.chat), per a 2026-06-10 article:** — [CSDN/AtomGit](https://gitcode.csdn.net/6a284493662f9a54cb7bc93a.html)
  - Built on iztro; delivered as a PWA.
  - Free tier: natal chart only, 3 AI chats per day, 1 profile.
  - VIP: 大限, 流年, 流月 and 流日; 100 chats per day; unlimited profiles; deep reports at 50% off.
  - Token "紫米": 10 ≈ ¥1. An extra chat costs 2, an extra profile 50, a deep report 188.
- **Other sites built on the open-source stack:**
  - zw.tokenxiu.com: free charting, 13-dimension reading, 合盤 and 同盤人數 ([xjoey1957](https://github.com/xjoey1957/ziwei-mcp)).
  - ziweichat.vercel.app and zwknows.vercel.app ([ziweiknows](https://github.com/ziweiknows/ziwei-chat)).
  - iztro's hosted `iztro-ziwei-v3` ([openai-iztro-agents-js](https://github.com/SylarLong/openai-iztro-agents-js)).
- **天樞命理Agent (Taiwan coverage 2025-02-24, updated 2026-08-04):** — [電腦王阿達](https://www.kocpc.com.tw/archives/587571)
  - Free; covers 八字, 紫微 and name analysis.
  - Engines: iztro, lunisolar and cnchar; the article says the solar-time formula was generated by Claude.
  - LLM choice: Gemini 2.0 flash or DeepSeek-R1 (32B Qwen distill). Both models are now dated.
  - Features: 我要問事, and a prompt export to ChatGPT.
  - Shared by Linux.do user Kevin525.
- **科技紫微網 (founded by 張盛舒; search summary):** 2026 紫微流年 readings; an "有卦AI占卜師"; 紫微運勢 is member-only; the app is rated 4.9★ from 898 ratings. — [App Store](https://apps.apple.com/tw/app/id560046935)
- **Other Taiwan/HK apps and sites (search summaries):**
  - 易仙紫微斗數 (AI分析): AI star interpretation and Q&A. — [App Store](https://apps.apple.com/app/id314481272)
  - 小紫薯: AI 紫微 with 三方四正 readings. — [App Store](https://apps.apple.com/mx/app/%E5%B0%8F%E7%B4%AB%E8%96%AF-ai%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%91%BD%E7%90%86%E5%88%86%E6%9E%90%E8%BC%94%E5%8A%A9%E5%A4%A7%E5%B8%AB/id6738033231)
  - 玩美 AI Chat (multi-model). — [Perfect Corp](https://www.perfectcorp.com/zh-tw/consumer/blog/ai-chat/ai-fortune-telling)
  - masterseanchan.com's "Tian Qi" offers free AI 紫微 readings ("紫微斗数の無料AI鑑定｜十二宮の命盤作成") in many languages. The operator's location, model and method could not be verified from the page. — [tianqi.masterseanchan.com](https://tianqi.masterseanchan.com/ja/skills/ziwei)
- **Mainland apps (search summaries; weak evidence):**
  - 賽博大師 – 問真八字排盤. — [App Store](https://apps.apple.com/us/app/%E8%B5%9B%E5%8D%9A%E5%A4%A7%E5%B8%88-%E9%97%AE%E7%9C%9F%E5%85%AB%E5%AD%97%E6%8E%92%E7%9B%98%E4%BA%94%E8%A1%8C%E8%BF%90%E5%8A%BF%E6%B5%8B%E6%B5%8B%E7%AE%97/id6743428036)
  - 测测: reportedly developed by 上海氣泡宇宙…; its user metrics come from unverifiable claims. — [CSDN](https://gitcode.csdn.net/6a12beb910ee7a33f274c51e.html)
  - 參天AI built the open-source [bazi-mcp](https://github.com/cantian-ai/bazi-mcp) (435★).
- **文墨天機:** the leading professional 紫微 charting app (飛星, 三合, 四化; configurable schools). No AI feature was found. — [App Store](https://apps.apple.com/cn/app/1193514811)
- **Ziwei AI (Show HN, Oct 2025; search summary):** claims LLMs fine-tuned on classic 紫微 texts; no accuracy data; the page returned 403. — [Indie Hackers](https://www.indiehackers.com/product/ziwei-ai)

### Inferences
- The common freemium pattern is about 3 free AI messages per day, a VIP tier around 100 per day with 大限/流年/流月 unlocked, and one-off "deep reports." It is a reasonable reference for the requester's subscription design.
- → Site: the real competitor is "paste into ChatGPT/Gemini" plus free iztro sites. A paid Taiwan product must visibly offer what those cannot:
  - Verified chart facts with an evidence panel.
  - The same answer every time for base readings.
  - Persistent memory of the user's life context.
  - Taiwan-school conventions in Traditional Chinese.
  - Specialist tools: 合盤, 流年 timelines, a second-opinion check, practitioner draft reports.

### Gaps
- No reliable user or revenue numbers were found for 测测, 問真八字, 科技紫微網's AI features, or any Taiwan AI 紫微 product.
- Hong Kong AI 紫微 products are poorly documented.
- No traffic data (Similarweb or similar) was retrieved.

## 7. Regulatory and ethical context (mainland China, Taiwan, app stores)

### Takeaway
- **Mainland China:** "宣揚邪教和封建迷信" is listed as illegal content in the 2019 《網絡信息內容生態治理規定》 Art. 6(7). Spirituality content is often shadow-banned. The 2025–2026 清朗 AI campaigns removed thousands of AI products, but no fortune-telling-specific AI rule was found.
- **Taiwan:** no AI-fortune-specific regulation was found. The practical obligations are:
  - The amended 個資法 (promulgated 2025-11-11, adds incident notification to 個資會).
  - 消保法 §19 cooling-off rules, whose digital-content exemption requires the consumer's prior consent.
- **Apple:** Guideline 4.3(b) (updated 2026-10-16) names fortune telling as a saturated category that needs a "meaningfully different" experience.

### Cited Findings
- **CAC 《網絡信息內容生態治理規定》 Art. 6** (2019, still the operative text as fetched): content producers must not create or publish "(七)破壞國家宗教政策，宣揚邪教和封建迷信的". — [CAC](https://www.cac.gov.cn/2019-12/20/c_1578375159509309.htm)
- **MIT TR:** BaZi and astrology sit in an "ambiguous regulatory position"; spirituality content is often shadow-banned and censored keywords shift; Fatetell pivoted overseas. — [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)
- **清朗 campaigns:**
  - 清朗·整治AI技術濫用 launched April 2025 for 3 months ([CAC launch notice](https://www.cac.gov.cn/2025-04/30/c_1747719097461951.htm)). A June 2025 update said phase 1 handled more than 3,500 non-compliant AI products. (search summary — [新華網](https://www.news.cn/politics/20250620/b71eab9b1d7d43bd9eca8846bbe7ca71/c.html))
  - 清朗·整治AI應用亂象 launched April 2026 ([IT之家](https://www.ithome.com/0/945/635.htm)). CAC's 2026-07-06 notice reports phase 1 results:
    - 1.4萬餘款 AI products handled (websites, apps, agents).
    - 600餘萬條 items of content cleaned and 2.6萬餘個 accounts handled.
    - 1300餘個 AI goods delisted and 9 non-compliant open-source datasets handled.
    - Targets: missing model filings, weak review/filtering, data poisoning, missing AI-content labels.
    - Phase 2 targets AI-made false information, impersonation, harm to minors and paid commenter armies.
    - 算命/迷信 is not named.
    - Huawei's app store added dedicated review of generative-AI filing and labeling.
    - Source: [CAC](https://www.cac.gov.cn/2026-07/06/c_1785081384384987.htm); [科技日報](https://www.stdaily.com/web/gdxw/2026-07/06/content_543014.html)
- **Cultural framing in mainland media:** a 2026 文藝報 commentary (徐洋晨、劉書亮) treats "AI算命" on 小紅書 as a youth phenomenon of self-labeling, not as an enforcement matter. — [中國作家網](https://www.chinawriter.com.cn/n1/2026/0909/c404076-40795520.html)
- **AI Anthropomorphic Interactive Services interim measures (search summary):** effective 2026-07-15. Afterwards 豆包, 通義千問 and 元寶 paused some custom-agent and companion features. This matters if a "命理大師" persona is offered in mainland China. — [AI Weekly](https://aiweekly.co/alerts/china-forces-doubao-qwen-to-shut-ai-companion-features)
- **Official framing in China:** a 中國反邪教 / 科普中國 piece calls DeepSeek fortune-telling a Barnum effect and advises against buying 轉運物品 or making major decisions from AI predictions. — [澎湃](https://m.thepaper.cn/newsDetail_forward_30470842)
- **Taiwan 個資法 amendment:**
  - Promulgated 2025-11-11; headline point is "明訂向個資會通報個資事故之義務"; effective date to be set by the Executive Yuan. — [理律 Lee and Li](https://www.leeandli.com/TW/NewslettersDetail/7532.htm)
  - Earlier stage: party-caucus negotiation agreed the amendment in August 2025. — [經濟日報](https://money.udn.com/money/story/5636/8977869)
- **個資法 Art. 3 (search summary):** data-subject rights to access and correction cannot be waived in advance by contract. — [台北律師公會 PDF](https://www.twba.org.tw/upload/article/20251015/3404298e17114f94aef2d05fa9ec17c3/3404298e17114f94aef2d05fa9ec17c3.pdf)
- **Privacy risk of birth data in AI fortune services (search summary):** user birth data may be collected, leaked or misused. — [The News Lens](https://www.thenewslens.com/article/270378)
- **Taiwan 消保 cooling-off exemption:**
  - 通訊交易解除權合理例外情事適用準則 §2(5), issued under 消保法 §19 and effective 2016-01-01, exempts "非以有形媒介提供之數位內容或一經提供即為完成之線上服務，經消費者事先同意始提供".
  - The Executive Yuan says applicability is case-by-case.
  - One business's terms treat subscriptions as continuing services outside the exemption. That is a business's own term, not law.
  - Sources: [行政院](https://www.ey.gov.tw/Page/8F51FEE53AB45EA9/d09b1f97-08be-4e98-9726-3417fce28004); [條文](https://6laws.net/6law/law3/通訊交易解除權合理例外情事適用準則.htm); [lawplayer](https://lawplayer.com/refund)
- **Apple App Review Guidelines 4.3(b)** ("Last Updated: October 16, 2026"):
  - "Certain kinds of apps, such as dating, flashlight, sound effects, wallpaper, simple timers, and fortune telling, are well established on the App Store and we will not accept new submissions unless they offer a meaningfully different or improved experience. We may remove these apps from the App Store going forward if they are not updated, improved, or do not attract customers." — [Apple](https://developer.apple.com/app-store/review/guidelines/)
  - Apple tightened its low-quality-app rules in June 2026. — [MacRumors](https://macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/)
- **Ethics voices:**
  - Zhang Shiyao (XJTLU) warns users may treat AI as an all-knowing authority, and hyperspecific life advice could have serious consequences.
  - Ting Guo (CUHK) says divination gives a sense of control during economic stagnation.
  - Source: [MIT TR](https://www.technologyreview.com/2025/03/03/1112604/deepseek-fortune-teller-china/)

### Inferences
- → Site (個資): send Gemini only the anonymized chart JSON. Leave out name, exact birthplace and account identifiers. Document this in the privacy policy, and prepare incident-notification procedures for the amended 個資法. Birth date and time plus account data are personal data, and life-event logs (Q5) raise the stakes.
- → Site (消保): before a paid digital report or subscription is delivered, get an explicit checkbox consenting to immediate provision and waiving the 7-day cancellation. Consider pro-rated refunds for subscriptions, since the exemption is judged case by case.
- → Site (distribution): starting web-first avoids Apple 4.3(b). A later iOS app would need to show a "meaningfully different" experience; evidence-backed, verified-chart AI is a credible argument.
- → Site (ethics): codify no fear, no upsell of 開運商品, no deterministic death/illness/divorce predictions, and boundary language for health, legal and finance. That also differentiates the site from sycophantic or alarming general-chatbot outputs.

### Gaps
- No Google Play policy text specific to fortune-telling apps was found.
- No Taiwan 消保會, 數位發展部 or court action involving AI fortune services was found.
- Gemini API data-use terms (paid vs free tier training use) were not researched here and should be checked before launch.
- Whether Taiwan's AI basic-law regime (status in 2026) affects consumer AI fortune services was not verified.
- Whether birth date and time count as any special category under 個資法 was not confirmed; it is most likely ordinary personal data, but this is unverified.
