# 中断提问恢复

This release requires DSH 0.2.1-alpha.1 or a compatible 0.2 release. See [compatibility details](docs/dsh-0.2-compatibility.md).

独立 DSH 插件，不修改官方源码。正常等待、完成或取消的 ask_user_question 使用官方组件。仅 TOOL_OUTCOME_UNKNOWN、TOOL_NOT_STARTED、ASK_ABORTED 且问题参数有效时，显示问题、单选/多选和自由文本。

用户点击「发送补充回答」后，通过官方 scope.conversation.send 向原会话发送新的用户消息，不伪造旧工具成功、不修改历史日志、不自动替用户选择。发送期间防重复，失败保留输入并显示错误。原聊天输入框草稿不被覆盖。网页刷新会清除尚未发送的卡片选项，已发送的消息由官方会话持久化。

安装：dsh plugin --profile web add github:vb2250158/dsh-question-recovery#<commit>。重启 DSH 并刷新页面。新增客户端依赖官方提问 UI 和工具卡片插件。测试覆盖可恢复错误识别、无效参数拒绝、正常提问回退；真实会话发送需要页面验收。

## Git 安装来源

将 `<commit>` 替换为本仓库完整提交号。插件代码与运行所需产物随 Git 交付；用户设置、凭据和聊天记录不属于本仓库。

## Plugin display metadata

The plugin list shows **Question recovery** in English and **提问恢复** in Chinese, following the DSH interface language. `locale/en.json` and `locale/zh.json` provide the title and description; `icon.svg` supplies self-contained artwork. The package exports and publishes these resources. The icon is adapted from Lucide; see [ICON_LICENSE.txt](ICON_LICENSE.txt).
