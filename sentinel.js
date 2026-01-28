const { Octokit } = require("@octokit/rest");

const CONFIG = {
    owner: process.env.REPO_OWNER,
    repo: process.env.REPO_NAME,
    token: process.env.GITHUB_TOKEN
};

const octokit = new Octokit({ auth: CONFIG.token });

// --- 🔴 1. 核心保留区 (只有命中这些才会存详情) ---
const KEEP_STRATEGIES = {
    ANDREESSEN: (text, repo) => (text.match(/agi|infra|llm|cuda|compiler|quantization|tensor|gpu/i)) ? 'TECH_ACCELERATOR' : null,
    TORVALDS: (text, repo) => {
        const isHardcore = ['Rust', 'C', 'C++', 'Zig'].includes(repo.language);
        return (isHardcore && text.match(/kernel|driver|runtime|engine|embedded|performance/i)) ? 'CORE_PRAGMATISM' : null;
    },
    NAVAL: (text, repo) => (text.match(/protocol|sdk|api-first|autonomous|agent|permissionless|defi/i) && repo.forks > 20) ? 'CODE_LEVERAGE' : null,
    GRAHAM: (text, repo) => (text.match(/reimagining|alternative to|solving the problem of|new way|vs code/i)) ? 'PARADIGM_SHIFT' : null
};

// --- 🔵 2. 趋势统计区 (只计数，不存详情) ---
// 这些标签只会出现在顶部的 trend_summary 里，告诉你现在的“主流”是什么
const STAT_ONLY_STRATEGIES = {
    SKILLS: (text) => (text.match(/skills|roadmap|path|learning|guide|101|tutorial/i)) ? 'TALENT_GROWTH' : null,
    INTERVIEW: (text) => (text.match(/interview|questions|leetcode|offer/i)) ? 'CAREER_MOVES' : null,
    RESOURCE: (text) => (text.match(/awesome|collection|list|curated|resources|template|dataset/i)) ? 'KNOWLEDGE_BASE' : null
};

async function run() {
    console.log("🚀 Sentinel [净网版] 启动...");
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const query = `stars:>50 created:>=${yesterday}`;
        console.log(`📡 扫描指令: ${query}`);

        const { data } = await octokit.search.repos({
            q: query, sort: 'stars', order: 'desc', per_page: 50
        });

        // 📊 统计面板
        const stats = {}; 
        // 📦 最终入库的精英项目
        const eliteItems = [];

        data.items.forEach(repo => {
            const text = (repo.name + " " + (repo.description || "")).toLowerCase();
            let isKeeper = false; // 是否保留详情
            const tags = [];

            // 1. 判定是否为“精英项目” (Keepers)
            for (const [name, logic] of Object.entries(KEEP_STRATEGIES)) {
                const tag = logic(text, repo);
                if (tag) {
                    tags.push(tag);
                    isKeeper = true; // 只要命中一个核心策略，就保留
                }
            }

            // 2. 判定是否为“趋势噪音” (Stats Only)
            for (const [name, logic] of Object.entries(STAT_ONLY_STRATEGIES)) {
                const tag = logic(text);
                if (tag) tags.push(tag);
            }

            // 3. 如果什么都没命中，归类为“野生热点”
            if (tags.length === 0) {
                tags.push('VIRAL_UNCATEGORIZED');
            }

            // --- 关键步骤：只统计，不一定保存 ---
            
            // A. 更新统计数据 (让指挥官知道主流是什么)
            tags.forEach(t => { stats[t] = (stats[t] || 0) + 1; });

            // B. 只有“精英”才入库
            if (isKeeper) {
                eliteItems.push({
                    name: repo.full_name,
                    desc: repo.description,
                    stars: repo.stargazers_count,
                    tags: tags, // 这里的 tags 可能包含 [TECH_ACCELERATOR, TALENT_GROWTH]
                    url: repo.html_url
                });
            }
        });

        // 生成简报字符串
        const summaryStr = Object.entries(stats).map(([k, v]) => `${k}:${v}`).join(', ');
        console.log(`📊 趋势分布: ${summaryStr}`);
        console.log(`🧹 清洗结果: 扫描 ${data.items.length} -> 保留 ${eliteItems.length}`);

        if (data.items.length > 0) {
            const path = `data/tech/${new Date().toISOString().split('T')[0]}/sentinel-${new Date().getHours()}h.json`;
            
            await octokit.repos.createOrUpdateFileContents({
                owner: CONFIG.owner,
                repo: CONFIG.repo,
                path: path,
                message: `🤖 Elite Data: ${eliteItems.length} items (Trend: ${summaryStr})`,
                content: Buffer.from(JSON.stringify({
                    meta: { 
                        scanned_at: new Date().toISOString(),
                        total_scanned: data.items.length,
                        // ✨ 这里就是你要的“只留标签”：即使 eliteItems 是空的，这里也会告诉你现在的热点是什么
                        trend_summary: stats 
                    },
                    items: eliteItems // ✨ 这里只会剩下真正有价值的项目
                }, null, 2)).toString('base64')
            });
            console.log(`✅ 存档完毕。`);
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
}

run();
