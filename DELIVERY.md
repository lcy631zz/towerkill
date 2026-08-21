# 塔罗杀：终端版交付说明

## 当前版本

本版本将界面重构为参照 7‑Zip 的**低装饰、三栏、表格优先**布局：左侧为文本导航，中间为问事、规则表与结果终端输出，右侧为精简状态栏。已移除历史记录、登录入口、归档按钮和抽牌时的数据库写入；每次问事都是独立的单次流程。

三张结果牌采用原创的文字化卡面：保留三国杀式字段层级，包括牌类、牌名、类别、花色/点数、技能、效果、典故、象征关键词与明确的正位/逆位状态。页面不使用官方插画、牌背或其他官方视觉资产。

| 模块 | 状态 | 说明 |
|---|---:|---|
| 三数与起卦 | 已完成 | A、B、C 均校验为 1–999；严格按照乾一、兑二、离三、震四、巽五、坎六、艮七、坤八映射。 |
| 三张抽牌 | 已完成 | 156 张结构化牌池洗牌，三张牌分别决定正逆位。 |
| 规则本机模式 | 已完成 | 不调用 LLM 或外部 API，以牌面、卦象和预设模板输出可读的娱乐解读。 |
| 默认在线模式 | 已完成 | 使用应用默认的在线解读服务并以 SSE 显示。 |
| 自定义 API 模式 | 已完成 | 支持用户输入 HTTPS OpenAI 兼容地址、模型名和 API Key；密钥不写入数据库。 |
| 本地模型模式 | 已完成 | Electron EXE 内可连接 `127.0.0.1` / `localhost` 的 OpenAI 兼容服务，例如 Ollama。 |
| Windows EXE 工程 | 已完成 | 已配置 Electron 与 electron-builder，可在 Windows 上输出安装版与 portable EXE。 |

> **娱乐占卜，切勿迷信，结果不构成任何现实决策依据**

## 无模型是否可行

**完全可行。** 抽牌、正逆位、梅花易数的本/互/变卦与体用关系本身都是可复算规则，不需要 LLM。规则本机模式的优势是离线、稳定、不需要 Key、不会把问句发送给模型服务；局限是它只能按预设模板组合牌与卦象，难以像 LLM 一样针对问题的细微语境调整措辞、综合更长的上下文或生成更有变化的叙事。

如果用户希望更自然、更有个性的关联解读，可选择默认在线服务、自己的 OpenAI 兼容 API，或本机 Ollama。模式的详细配置、隐私边界和 Windows EXE 打包步骤见 [`DESKTOP.md`](./DESKTOP.md)。

## 验证

已通过以下检查：

```bash
pnpm check
pnpm test
```

当前测试为 **4 个测试文件、9 条断言**，覆盖八卦规则、牌池实体数量、抽牌接口和正逆位卡片字段。另已通过本机规则模式的 SSE 接口验证，确认该模式返回“未调用任何大模型”的通知与完成事件。

桌面版主进程脚本已通过语法检查，Electron 运行时与 electron-builder 已安装。`pnpm build` 在当前 Linux 沙箱的 Vite 渲染阶段两次因内存限制终止，因此未在此环境产出 Windows EXE；请在 Windows 10/11 x64 的本地项目文件夹中运行 `pnpm desktop:package` 生成并实测安装版与 portable EXE。若要直接在 Manus Desktop 上制作 EXE，请先绑定一个 Windows 本地项目文件夹。

## 数据边界

牌库口径、来源和原创卡面边界见 [`DATA_NOTES.md`](./DATA_NOTES.md)。三国杀正逆位与“六壬意象旁注”均为本项目的娱乐解读层；后者不等同于包含干支、月将、四课、三传的传统完整大六壬排盘。

## 参考

1. [三国杀官方规则集 3.0：牌的定义](https://gltjk.com/sanguosha/rules/glossary/card.html)
2. [三国杀标准版组件与牌表](https://zh.wikipedia.org/zh-hans/%E4%B8%89%E5%9C%8B%E6%AE%BA%E6%A8%99%E6%BA%96%E7%89%88)
3. [electron-builder 官网](https://www.electron.build/)
4. [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
