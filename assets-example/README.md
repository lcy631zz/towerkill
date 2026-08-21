# 本地卡图素材包

本文件夹示例仅包含 `manifest.json`，不包含任何第三方图片。用户请在自己的电脑上建立一个单独的素材文件夹，再在 Windows EXE 内点击“**[ IMPORT ] 选择素材文件夹**”。

```text
my-sanguosha-assets/
  manifest.json
  cards/
    game-001.png
    game-046.jpg
    general-015.webp
```

`manifest.json` 必须使用本应用的**实体牌 ID**。例如，`game-001` 是牌池第一张游戏牌，`general-015` 是第 15 张武将牌；同名或同花色点数的多张实体牌都必须使用各自 ID。程序允许的图片格式是 PNG、JPG、JPEG 与 WEBP。

```json
{
  "schemaVersion": 1,
  "cards": {
    "game-001": "cards/game-001.png",
    "game-046": "cards/game-046.jpg",
    "general-015": "cards/general-015.webp"
  }
}
```

程序会拒绝 `../` 等越出素材文件夹的路径。清单中找不到的图片不会中断问事，只会回退显示原有文字卡面。逆位会将**整个卡面**以 180° 倒置方式显示，但不会改写用户原始图片。
