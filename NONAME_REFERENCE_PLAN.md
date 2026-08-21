# 参考无名杀工程结构：塔罗杀桌面版实施说明

> **原则**：本方案只借鉴工程分层与桌面端组织思想，不复制无名杀源代码、第三方卡图、具体卡牌文案、音频或扩展包。本文件是工程实现说明，不构成法律意见。

## 1. 无名杀当前的结构给出的启发

无名杀主仓库采用多应用组织：`apps/core` 为核心内容，另有 `apps/electron` 和 `apps/mobile` 作为不同平台外壳；核心目录中将 `card`、`character`、`extension`、`game`、`image`、`layout`、`mode`、`theme` 与类型定义分开。[1] [2] 对塔罗杀而言，可借鉴的不是游戏数据或具体实现，而是这条边界：**领域数据、界面、平台壳、可选资产和扩展配置彼此分离**。

| 无名杀的通用分层 | 塔罗杀的独立对应层 | 是否可直接复制 |
|---|---|---:|
| `card` / `character` | `shared/standardDeck.ts`：本项目自行维护的抽牌元数据 | 否；仅借鉴“数据与 UI 分离” |
| `image` / `audio` | 用户本地素材目录与牌图清单 | 否；官方素材需由用户自行提供 |
| `game` / `mode` | `shared/divination.ts`、`server/divinationEngine.ts`：洗牌与起卦 | 否；使用当前独立实现 |
| `layout` / `theme` | `client/src/index.css` 与 `OracleCard.tsx` | 否；使用当前终端风格实现 |
| `apps/electron` | `desktop/main.mjs` | 否；当前 Electron 主进程独立实现 |
| `extension` | `providers/`（未来）：自定义 API / Ollama 配置适配器 | 否；仅借鉴“可插拔接口” |

## 2. 两条可操作路径

### 路径 A：只参考架构，不引入无名杀代码（推荐）

这是当前项目最合适的路径。塔罗杀保留自己的 React、Express 与 Electron 代码，仅按如下方式继续整理：

```text
shared/
  standardDeck.ts          # 牌池元数据与唯一 ID
  divination.ts            # 起卦、体用、正逆位等纯规则
client/src/
  components/OracleCard.tsx # 卡面展示（支持正/逆位旋转）
  providers/               # 可选：自定义 API / 本机 Ollama 配置 UI
server/
  divinationEngine.ts      # 抽牌与结果组合
  interpretationStream.ts  # 规则模式与用户自定义模型适配
desktop/
  main.mjs                 # 可缩放 Electron 窗口与本地服务启动
user-assets/               # 仅运行时读取，不进入 Git / 不随 EXE 公开分发
```

具体操作如下：先维持当前规则本机模式作为默认；再把“自定义 API”和“本地 Ollama”抽成独立 provider；最后在 Electron 中添加“选择卡图文件夹”动作，读取用户本地的 `manifest.json`，按 `card.id` 或卡牌实体 ID 匹配图片。逆位只在卡片容器上施加 CSS `transform: rotate(180deg)`，不改写原图文件。

这种方式**不触发无名杀代码的 GPL 继承问题**，因为没有复制或链接其代码；但使用官方卡图的边界仍应按用户自备本地素材、非营利内部使用和不公开分发处理。

### 路径 B：实际复制或修改无名杀代码

若要直接复制、修改或将无名杀代码合并到塔罗杀，必须先把它当作 GPL-3.0 代码处理。无名杀 README 明示项目基于 GPL-3.0，并要求二次打包和分发保留出处、不要用于商业用途。[1]

具体操作应为：在 Git 历史中保留上游来源与提交基线；在 `LICENSES/` 中保留 GPL-3.0 与无名杀署名/项目约定；明确记录改动文件；随可执行程序提供对应源代码、构建方式与 GPL 许可文本；将复制或派生部分以及与之构成单一程序的部分按 GPL-3.0 要求发布。**不要**把无名杀代码混入一个只发布二进制、拒绝提供对应源码的闭源 EXE。

即使满足 GPL-3.0，仍不能因此取得无名杀仓库中不属于其开源授权范围的第三方素材权利；官方三国杀卡图与特定文案应另行处理。

## 3. 本项目建议的执行顺序

| 顺序 | 要做什么 | 产物 | 是否需要无名杀代码 |
|---:|---|---|---:|
| 1 | 保持当前独立规则、桌面窗口和三种解读器 | 可离线运行的 EXE 工程 | 否 |
| 2 | 新增本地资产选择器与 `manifest.json` 校验 | 用户本地卡图映射层 | 否 |
| 3 | 用户提供合法取得的卡图包，按实体 ID 映射 | 卡图显示 + 逆位整张倒置 | 否 |
| 4 | 如需扩展能力，新增自己的 provider 接口 | 本地模型/API 扩展点 | 否 |
| 5 | 只有在确有必要时才评估 Fork 无名杀 | GPL 派生项目与源码发布流程 | 是 |

对“塔罗杀”而言，第 1–4 步足以完成所需的占卜功能和本地素材显示；没有功能性理由必须复制无名杀代码。因此建议先走**路径 A**。

## 4. 用户本地素材包的推荐格式

```text
sanguosha-assets/
  manifest.json
  cards/
    basic_sha_club_j.png
    trick_wuxie_spade_12.png
    general_sunquan.png
```

`manifest.json` 仅存映射，不必包含卡图：

```json
{
  "schemaVersion": 1,
  "cards": {
    "game-001": "cards/game-001.png",
    "general-015": "cards/general-015.png"
  }
}
```

Electron EXE 只读取用户手动选择的本地文件夹；素材文件不纳入 Git、不会上传至服务器、也不随公开发布包分发。未找到图片时回退为当前原创文字卡面。

## 参考

1. [libnoname/noname：README、项目使用约定与 GPL-3.0](https://github.com/libnoname/noname)
2. [libnoname/noname：apps/core 目录](https://github.com/libnoname/noname/tree/main/apps/core)
3. [libnoname/noname：apps 目录（core / electron / mobile）](https://github.com/libnoname/noname/tree/main/apps)
