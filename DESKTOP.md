# Windows EXE 与解读模式说明

## EXE 封装

项目已配置 Electron 与 electron-builder。其启动逻辑会在用户电脑上拉起本地 Node 服务，再在一个原生窗口加载终端式页面；因此规则模式、本地模型模式和用户 API 模式均不依赖项目数据库或登录。

在 **Windows 10/11 x64** 电脑中安装 Node.js 22 后，于项目根目录执行：

```powershell
pnpm install
pnpm desktop:package
```

完成后，`release/` 下会生成一个 NSIS 安装 EXE 与一个免安装 portable EXE。没有配置 Windows 代码签名证书时，Windows SmartScreen 可能显示“未知发布者”提示；这是未签名桌面应用的常见分发限制。electron-builder 官方说明支持生成 Windows 安装器、portable 构建与分发归档。[1]

当前在线沙箱为 Linux 环境，未生成可在 Windows 上实测的 EXE；应在 Windows 机器、或已绑定的 Windows 本地项目文件夹内执行以上打包命令并实测。

## 解读模式比较

| 模式 | 是否调用模型 | 优势 | 局限 |
|---|---:|---|---|
| 规则本机模式 | 否 | 离线、稳定、无需 API Key、抽牌与卦象始终可复算 | 语言是模板化的；无法随问句细腻调整语气、追问上下文或形成更丰富的三牌联想。 |
| 自定义 OpenAI 兼容 API | 是 | 用户可接入自己选择的兼容服务与模型 | 需要自行提供 HTTPS 地址、模型名与 API Key；密钥仅随本次请求传输，应用不将其存入数据库。 |
| 本地 OpenAI 兼容服务 | 是 | 推理由用户电脑完成，适合希望保留数据本地性的用户 | 需要先安装并运行本地模型；速度和质量受本机硬件与模型规模影响。 |

> 不接 LLM **完全可行**。规则模式仍会给出三张牌、正逆位、梅花易数本/互/变卦、体用关系与可读的模板化解读；它失去的是“围绕你具体问题做灵活语义关联”的能力，而不是抽牌或起卦本身。

## 本地模型（Ollama）

Ollama 提供 OpenAI 兼容接口；本地接口无需身份验证，常见地址为 `http://127.0.0.1:11434/v1`。[2] 在 Electron EXE 中选择“本地 OpenAI 兼容服务（Ollama）”，填写本机已下载的模型名即可。网页预览出于浏览器网络边界，不能代替桌面 EXE 访问你的电脑本机模型。

## 导入本地卡图

Windows EXE 的“**本地卡图 / ASSETS**”区提供“**[ IMPORT ] 选择素材文件夹**”按钮。用户选择含 `manifest.json` 的文件夹后，程序仅在本机读取清单和清单中列出的 PNG、JPG、JPEG 或 WEBP 图片。图片不会上传至服务器、不会写入数据库，也不会随 EXE 重新分发。

清单以本项目的实体牌 ID 对应相对文件路径，例如 `game-001`、`game-046` 与 `general-015`。同名游戏牌可能有多个实体条目，因此应逐条映射。示例和完整格式说明在 [`assets-example/README.md`](./assets-example/README.md)。找不到某个条目时，程序自动保留该张牌的文字卡面；抽到逆位时，对加载成功的**整张本地卡图**施加 180° 旋转显示。

## 参考

1. [electron-builder 官网](https://www.electron.build/)
2. [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)
