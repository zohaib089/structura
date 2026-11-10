import type { LandingStrings } from './types'

export const zhHans: LandingStrings = {
  documentTitle: '{name} \u2014 看清代码如何组织，以及哪里有风险',
  metaDescription: '{name} 把你电脑上的项目变成一张围绕真实入口点的环形地图。无需账号。查看图谱无需上传任何内容。',
  skipLink: '跳到正文',
  homeLabel: '{name} 首页',
  nav: { label: '主导航', product: '产品', how: '工作原理', docs: '文档', githubLabel: 'GitHub 上的 {name}' },
  cta: { viewer: '试用查看器', selfHost: '自托管', scan: '扫描项目', projects: '前往你的项目', selfHostGuide: '自托管指南' },
  hero: {
    eyebrow: '{name} \u00b7 本地优先',
    titleLead: '看清代码如何组织 \u2014 ',
    titleEmphasis: '以及哪里有风险。',
    leadBefore: '{name} 把你电脑上的项目变成一张',
    leadMap: '环形地图',
    leadMiddle: '，以真实的起点为中心。',
    leadNoAccount: '无需账号，无需上传',
    leadAfter: '即可查看图谱。',
    scanPrompt: '项目准备好了吗？',
    graphTitle: '示例项目地图，以入口文件为中心按环绘制',
    legendLabel: '如何读线条',
    sampleTag: '示例数据 \u2014 虚构项目',
    inspectDefaultTitle: 'main.ts \u2014 项目的起点',
    inspectDefaultBody: '将鼠标悬停或用 Tab 移到某个文件上，即可查看它的连接。每一环表示离起点的步数。',
    inspectEntryBody: '其余一切都以离这里的步数来衡量。',
    inspectEntryLabel: '入口点',
    entryTag: '入口点',
    graphListLabel: '示例地图中的文件',
    graphTextIntro:
      '示例地图的文本版本。起始文件 main.ts 位于中心。第 1 环有 8 个 main.ts 直接使用的文件。第 2 环有 12 个通过它们到达的文件。第 3 环还有 10 个。每个文件用图标和文字显示其最严重的问题。在代码中找到的连接用实线，推断的用虚线，无法确认的用点线。'
  },
  steps: { one: '{n} 步', other: '{n} 步' },
  a11y: { node: '{label}，距起点 {steps}。{link}。{issue}', noIssues: '未发现问题。', issue: '{severity}级问题', issueSentence: '{severity}级问题。', inspectSteps: '距 {start} {steps}', inspectLink: '连接：' },
  proof: {
    label: '一览',
    items: [
      ['在你的电脑上运行', '代码留在原处。'],
      ['查看无需账号', '打开图谱文件即可浏览。'],
      ['目前支持 TypeScript 和 JavaScript', '其他语言会标为已跳过，而不是隐藏。'],
      ['每条连接都注明来源', '在代码中找到、推断，或无法确认。']
    ]
  },
  how: {
    kicker: '工作原理',
    title: '从文件夹到地图，只需三步。',
    lead: '把项目交给 {name}，让它读取文件，然后浏览结果。过程中可以随时查看进度。',
    step: '步骤',
    steps: [
      ['选择项目', '文件夹、zip 文件或 Git 链接。{name} 会先检查，并提示是否有内容过大。'],
      ['{name} 读取项目', '它会跟踪每个 import，记录对每条连接的把握程度，并沿途寻找风险点。'],
      ['阅读地图和报告', '从入口文件开始向外浏览。报告用通俗的语言告诉你先看什么。']
    ],
    sources: ['文件夹', 'Zip', 'Git 链接'],
    checking: { before: '正在检查 ', files: '1,240 个文件', middle: '\u2026 跳过 ' },
    loaderLabel: '正在分析代码',
    initialStatus: '正在运行分析器（第 3 / 7 个）',
    runScan: '运行示例扫描',
    previewToasts: '预览通知',
    phases: [
      ['正在准备文件', '正在检查 1,240 个文件\u2026'],
      ['正在分析代码', '正在运行分析器（第 3 / 7 个）'],
      ['正在分析代码', '正在运行分析器（第 7 / 7 个）'],
      ['正在生成报告', '正在汇总发现\u2026']
    ],
    finished: ['扫描完成', '已检查 150 个文件中的 142 个'],
    findingsLabel: '示例发现',
    findings: ['两个核心文件之间存在循环引用', '页面直接访问数据库层', '被大量文件引用的文件']
  },
  toasts: {
    sampleLoaded: '示例项目已加载',
    scanStarted: '扫描已开始',
    scanFinished: '扫描完成',
    scanFinishedBody: '已映射 142 个文件 \u00b7 2 条连接待检查',
    viewMap: '查看地图',
    previewInfo: '示例已加载',
    previewInfoBody: 'main.ts 是起点。',
    previewWarning: '有 2 条连接无法跟踪',
    previewWarningBody: '已列在覆盖范围中。',
    previewError: '无法读取一个文件夹',
    previewErrorBody: '请检查权限后重试。',
    retry: '重试'
  },
  connections: {
    kicker: '每条连接是如何找到的',
    title: '每条连接都有标注。',
    lead: '有些连接是确定的，有些是合理推断，还有些我们无法跟踪。{name} 会在线条本身和旁边的文字里告诉你各属哪一种。',
    lines: ['实线', '虚线', '点线'],
    rows: [
      ['在代码中找到', '就写在那里，例如直接的 import。这是最确定的情况。'],
      ['推断', '没有直接写出，但模式指向它 \u2014 例如按命名规则选中的文件。'],
      ['无法确认', '我们看到了连接，但无法判断它指向哪里。它会被列出供你自行检查 \u2014 绝不丢弃。']
    ]
  },
  coverage: {
    kicker: '覆盖范围',
    title: '不会悄悄跳过任何内容。',
    lead: '每次扫描都会报告检查了什么、没检查什么，干净的结果绝不会掩盖盲区。',
    note: '示例项目中的示意数字。',
    statValue: '142 / 150',
    statLabel: '个文件已检查 \u00b7 95%',
    barLabel: '已检查 150 个文件中的 142 个；跳过 8 个',
    rows: [
      ['暂不支持的语言文件 ', '（Python、Go）', '6 个文件'],
      ['无法跟踪的连接 ', '（运行时计算）', '2 条连接'],
      ['你要求忽略的文件 ', '（如 node_modules）', '已列出']
    ]
  },
  selfHost: {
    kicker: '自托管',
    title: '在你自己的电脑或服务器上运行。',
    lead: '{name} 本地优先。自行托管，代码永远不会离开你的网络。',
    bullets: ['使用 Docker Compose 运行', '数据和访问规则由你掌握', '源代码托管在 GitHub'],
    terminalLabel: '启动命令示例',
    terminalBadge: '示意',
    comments: ['# 1. 获取 {name}', '# 2. 启动', '# 3. 打开']
  },
  closing: { title: '准备好把项目看成一张地图了吗？', lead: '先在浏览器中试用示例，或自行托管。' },
  footer: { label: '页脚', docs: '文档', selfHost: '自托管' },
  severity: { critical: '严重', high: '高', medium: '中', low: '低', info: '无问题' },
  linkKind: { extracted: '在代码中找到', inferred: '推断', unresolved: '无法确认', start: '入口点' }
}
