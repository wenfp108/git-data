import axios from 'axios';
import fs from 'fs';
import path from 'path';

// --- 📡 前哨雷达配置 (Frontline Radar) ---
const CONFIG = {
    // 窗口：只看最近 7 天 (保持极其敏锐)
    LOOKBACK_DAYS: 30,
    
    // 门槛 A (权威)：顶级期刊影响因子 (Nature/Science)
    MIN_IMPACT_FACTOR: 20, 
    
    // 门槛 B (敏锐)：对于 ArXiv 或普通期刊，只要有 1 个引用就算“早期爆发”
    // (注：新论文在7天内能获得1个引用非常难，代表极高的关注度)
    MIN_EARLY_CITATIONS: 1, 
    
    CONTACT_EMAIL: process.env.CONTACT_EMAIL || 'sentinel@architect.alpha' 
};

// --- 🏆 顶级期刊白名单 (OpenAlex ID) ---
// s137773(Nature), s198393(Science), s54687(Cell), s146577(PNAS)
// 增加这个列表是为了防止刚发表 0 引用的顶级论文被过滤掉
const ELITE_JOURNALS = "s137773|s198393|s54687|s146577";

// --- 🧠 六大宗师策略 (覆盖全科技树) ---
const MASTER_STRATEGIES = {
    // 1. Andreessen: AI
    ANDREESSEN: (text) => (text.match(/large language model|llm|generative|transformer|agent|gpu|multimodal|diffusion|reasoning/i)) ? 'AI_CORE' : null,
    
    // 2. Darwin: Bio
    DARWIN: (text) => (text.match(/crispr|gene|synthetic biology|mrna|longevity|brain-computer|organoid|protein|biomanufacturing/i)) ? 'BIO_REVOLUTION' : null,

    // 3. Von Braun: Space & Defense
    VON_BRAUN: (text) => (text.match(/spacecraft|satellite|orbit|propulsion|hypersonic|missile|uav|swarm|radar|stealth|electronic warfare/i)) ? 'SPACE_DEFENSE' : null,

    // 4. Oppenheimer: Energy
    OPPENHEIMER: (text) => (text.match(/nuclear fusion|fission|plasma|tokamak|hydrogen|smr|directed energy|grid/i)) ? 'STRATEGIC_ENERGY' : null,

    // 5. Curie: Materials
    CURIE: (text) => (text.match(/solid-state battery|perovskite|superconductor|graphene|electrolyte|metamaterial|nanomaterial/i)) ? 'ADVANCED_MATERIALS' : null,

    // 6. Turing: Computing
    TURING: (text) => (text.match(/quantum|qubit|semiconductor|chip|photonic|neuromorphic|cryptography/i)) ? 'NEXT_COMPUTING' : null,
    
    // 7. Graham: Paradigm Shift
    GRAHAM: (text) => (text.match(/all you need|rethinking|towards a|roadmap|paradigm|survey/i)) ? 'PARADIGM_SHIFT' : null
};

async function run() {
    const now = new Date();
    // 转换为北京时间 (UTC+8)
    const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const hour = bjTime.getUTCHours();
    const ampm = hour < 12 ? 'AM' : 'PM';
    const timeLabel = `${ampm}-${hour}h`; 
    const dateStr = bjTime.toISOString().split('T')[0];

    const startDate = new Date(now.getTime() - CONFIG.LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📡 Frontline Radar [${timeLabel}] 启动前哨侦察...`);
    console.log(`   - 模式: 双轨制 (顶级期刊直通车 + 早期高热信号)`);
    console.log(`   - 范围: ${startDate} 至今`);

    // 🕸️ 第一张网：热度网 (Early Signals)
    // 逻辑：引用数 > 0 (捕捉 ArXiv 上的黑马，过滤掉大部分且新的水文)
    const hotUrl = `https://api.openalex.org/works?filter=from_publication_date:${startDate},cited_by_count:>${CONFIG.MIN_EARLY_CITATIONS - 1},type:article|review|preprint&sort=cited_by_count:desc&per_page=50`;

    // 🕸️ 第二张网：名门网 (Nuclear/Prestige)
    // 逻辑：指定顶级期刊 ID，且**不限引用数** (捕捉刚出炉的 Nature，哪怕引用是 0)
    const nuclearUrl = `https://api.openalex.org/works?filter=from_publication_date:${startDate},primary_location.source.id:${ELITE_JOURNALS},type:article|review&sort=publication_date:desc&per_page=20`;

    try {
        console.log("⚡ 发起双轨探测 (Heat + Prestige)...");

        // 并行请求
        const [hotRes, nuclearRes] = await Promise.all([
            axios.get(hotUrl, { headers: { 'User-Agent': `mailto:${CONFIG.CONTACT_EMAIL}` } }),
            axios.get(nuclearUrl, { headers: { 'User-Agent': `mailto:${CONFIG.CONTACT_EMAIL}` } })
        ]);

        // 🔥 数据合并与去重
        // 为什么要去重？因为一篇 Nature 论文如果引用很高，可能会同时出现在两个列表里
        const rawPapers = [...hotRes.data.results, ...nuclearRes.data.results];
        const uniqueMap = new Map();
        rawPapers.forEach(item => {
            if (!uniqueMap.has(item.id)) {
                uniqueMap.set(item.id, item);
            }
        });
        const uniquePapers = Array.from(uniqueMap.values());

        const elitePapers = [];
        const conceptHeatmap = {}; // 聚合概念热度
        const strategyStats = {}; 

        console.log(`📥 混合扫描池: ${uniquePapers.length} 篇 (去重后)，开始筛选...`);

        uniquePapers.forEach(paper => {
            const title = paper.title || "";
            // 提取概念标签
            const concepts = paper.concepts ? paper.concepts.map(c => c.display_name).join(" ") : "";
            const fullText = (title + " " + concepts).toLowerCase();
            
            const citations = paper.cited_by_count;
            const venue = paper.primary_location?.source;
            const impactFactor = venue?.summary_stats?.['2yr_mean_citedness'] || 0;
            const journalName = venue?.display_name || "ArXiv/Preprint"; 

            let isKeeper = false;
            let strategies = [];
            let keepReason = "";
            let signalType = "";

            // --- 策略 A: 核爆级 (Nuclear) ---
            // 逻辑：必须是高分期刊 (IF >= 20)
            if (impactFactor >= CONFIG.MIN_IMPACT_FACTOR) {
                isKeeper = true;
                signalType = "☢️ NUCLEAR";
                keepReason = `Top Journal (${journalName} IF:${impactFactor.toFixed(1)})`;
            }

            // --- 策略 B: 早期信号 (Early Signal) ---
            // 逻辑：不是核爆级，但有引用且命中关键词
            if (!isKeeper && citations >= CONFIG.MIN_EARLY_CITATIONS) {
                 // 必须命中至少一个大师策略，防止抓到无关的水文
                for (const [name, logic] of Object.entries(MASTER_STRATEGIES)) {
                    if (logic(fullText)) {
                        isKeeper = true;
                        signalType = "⚡ EARLY_SIGNAL";
                        keepReason = `Velocity: ${citations} citations in 1 week`;
                        break;
                    }
                }
            }

            // 如果已经入选，详细跑一遍策略打标签
            if (isKeeper) {
                for (const [name, logic] of Object.entries(MASTER_STRATEGIES)) {
                    const tag = logic(fullText);
                    if (tag) {
                        strategies.push(tag);
                        strategyStats[tag] = (strategyStats[tag] || 0) + 1;
                    }
                }
                
                // 如果没命中具体策略但因为高分期刊入选，标为通用科学
                if (strategies.length === 0) strategies.push("GENERAL_SCIENCE");

                // 🔥 关键步骤：统计这篇论文的概念，用于计算“发展方向”
                if (paper.concepts) {
                    paper.concepts.filter(c => c.level === 2 || c.level === 3).forEach(c => {
                        const score = citations + 1; // 基础分 + 引用加权
                        conceptHeatmap[c.display_name] = (conceptHeatmap[c.display_name] || 0) + score;
                    });
                }

                elitePapers.push({
                    title: title,
                    type: signalType, // 标记是核爆还是早期信号
                    journal: journalName,
                    metrics: {
                        citations: citations,
                        impact_factor: impactFactor.toFixed(1)
                    },
                    strategies: strategies,
                    url: paper.open_access?.oa_url || paper.doi,
                    reason: keepReason,
                    // 补充发布日期，方便后续排序
                    publication_date: paper.publication_date 
                });
            }
        });

        // 结果排序：核爆优先，其次按引用
        elitePapers.sort((a, b) => {
            if (a.type.includes("NUCLEAR") && !b.type.includes("NUCLEAR")) return -1;
            if (!a.type.includes("NUCLEAR") && b.type.includes("NUCLEAR")) return 1;
            return b.metrics.citations - a.metrics.citations;
        });

        // 计算最热的发展方向 (Hot Trends)
        const trendingConcepts = Object.entries(conceptHeatmap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // 取前5个最热概念
            .map(([name, score]) => `${name} (Heat:${score})`);

        // 落盘保存
        if (elitePapers.length > 0) {
            const filePath = `data/papers/${dateStr}/radar-${timeLabel}.json`;
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const fileContent = {
                meta: {
                    scanned_at_bj: bjTime.toISOString(),
                    total_captured: elitePapers.length,
                    // ✨ 核心回答：这里就是你要的“发展方向”
                    TRENDING_DIRECTIONS: trendingConcepts, 
                    strategy_summary: strategyStats
                },
                // 混合列表：既有核爆，也有潜力股 (取前 20 篇，防止太多)
                items: elitePapers.slice(0, 20) 
            };

            fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));
            console.log(`✅ [Radar] 侦测完成，已生成报告: ${filePath}`);
            console.log(`📈 正在涌现的发展方向: ${JSON.stringify(trendingConcepts)}`);
            console.log(`📊 捕获统计: ${elitePapers.length} 篇 (Nuclear: ${elitePapers.filter(e=>e.type.includes("NUCLEAR")).length})`);
        } else {
            console.log("💤 今日雷达静默 (无高价值早期信号).");
        }

    } catch (error) {
        console.error("❌ 探测失败:", error.message);
    }
}

run();
