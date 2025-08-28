# ScamSafe Frontend

> 网络诈骗防护平台前端 - 专业级威胁情报展示系统

## 项目概述

ScamSafe 是一个专业的网络诈骗防护平台前端项目，采用现代化的设计和开发标准，提供实时威胁情报展示、多类型诈骗警报管理和用户友好的交互体验。

### 主要特性

- 🛡️ **实时威胁情报** - 展示最新的网络诈骗警报和威胁信息
- 🎯 **智能分类筛选** - 按威胁类型（短信、邮件、电话、投资等）快速筛选
- ♿ **无障碍设计** - 支持字体大小调节，键盘导航，屏幕阅读器兼容
- 📱 **响应式布局** - 完美适配桌面、平板和移动设备
- ⚡ **高性能优化** - 模块化架构，按需加载，优化渲染性能
- 🎨 **专业界面** - 参考政府和企业级安全平台的设计标准

## 项目结构

```
scamsafe-frontend/
├── index.html                 # 主页面文件
├── package.json              # 项目配置和依赖
├── README.md                 # 项目说明文档
│
├── css/                      # 样式文件目录
│   ├── variables.css         # CSS 变量定义
│   ├── base.css             # 基础样式和重置
│   ├── components.css       # 组件样式
│   ├── layout.css          # 布局样式
│   └── responsive.css      # 响应式设计
│
├── js/                      # JavaScript 文件目录
│   ├── config.js           # 应用配置文件
│   ├── utils.js            # 工具函数库
│   ├── main.js             # 主程序入口
│   │
│   └── components/         # 组件目录
│       ├── fontController.js     # 字体大小控制
│       ├── filterController.js   # 筛选功能控制
│       └── alertManager.js       # 警报数据管理
│
├── assets/                 # 静态资源目录
│   ├── images/            # 图片资源
│   ├── icons/             # 图标文件
│   └── favicon.ico        # 网站图标
│
├── tests/                 # 测试文件目录
│   ├── setup.js           # 测试环境配置
│   └── *.test.js         # 测试用例
│
└── dist/                  # 构建输出目录（自动生成）
    ├── css/
    ├── js/
    └── assets/
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 现代浏览器（支持 ES6+）

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/scamsafe/frontend.git
cd scamsafe-frontend

# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 查看项目

### 构建项目

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 核心组件说明

### 1. AlertManager (警报管理器)
- **功能**: 管理威胁警报数据的加载、缓存和展示
- **特性**: 自动刷新、离线支持、数据缓存、错误处理
- **文件**: `js/components/alertManager.js`

### 2. FilterController (筛选控制器)
- **功能**: 处理威胁类型筛选和搜索功能
- **特性**: 智能筛选、筛选历史、键盘导航、URL 同步
- **文件**: `js/components/filterController.js`

### 3. FontController (字体控制器)
- **功能**: 提供无障碍的字体大小调节功能
- **特性**: 三级字体大小、键盘快捷键、本地存储、屏幕阅读器支持
- **文件**: `js/components/fontController.js`

## 样式系统

### CSS 架构
- **variables.css**: 全局 CSS 变量，包含颜色、字体、间距等设计规范
- **base.css**: 基础样式重置和通用元素样式
- **components.css**: 可复用组件样式（按钮、卡片、徽章等）
- **layout.css**: 页面布局和网格系统
- **responsive.css**: 响应式断点和移动端适配

### 设计系统
- **颜色方案**: 专业深色主题，符合网络安全行业标准
- **字体系统**: Inter 字体族，支持动态缩放
- **间距系统**: 基于 8px 网格的间距规范
- **组件系统**: 模块化设计，易于维护和扩展

## 开发指南

### 添加新的威胁类型

1. 在 `js/config.js` 中的 `threatTypes` 对象添加新类型：

```javascript
newThreatType: {
  id: 'newThreatType',
  name: 'New Threat Type',
  icon: 'fas fa-exclamation',
  color: '#ff6b6b'
}
```

2. 在 CSS 中添加对应的图标样式：

```css
.threat-icon.newThreatType {
  background: #ff6b6b;
}
```

### 自定义样式主题

修改 `css/variables.css` 中的 CSS 变量：

```css
:root {
  --primary-blue: #your-color;
  --secondary-blue: #your-color;
  /* 其他颜色变量 */
}
```

### 添加新的组件

1. 在 `js/components/` 目录创建新组件文件
2. 按照现有组件的结构编写代码
3. 在 `js/main.js` 中初始化新组件
4. 在 `index.html` 中引入组件脚本

## 数据接口

### Mock 数据
开发模式下使用模拟数据，位于 `alertManager.js` 的 `loadMockData()` 方法中。

### API 集成
生产环境下连接真实 API，配置在 `js/config.js` 的 `api` 对象中：

```javascript
api: {
  baseUrl: 'https://api.scamsafe.org',
  endpoints: {
    alerts: '/api/alerts',
    threatTypes: '/api/threat-types',
    statistics: '/api/statistics'
  }
}
```

## 无障碍设计

项目严格遵循 WCAG 2.1 AA 标准：

- ✅ 键盘导航支持
- ✅ 屏幕阅读器兼容
- ✅ 高对比度模式
- ✅ 字体大小可调节
- ✅ 焦点指示器
- ✅ 语义化 HTML
- ✅ ARIA 标签支持

## 性能优化

- **代码分割**: 组件按需加载
- **资源压缩**: CSS/JS 自动压缩
- **缓存策略**: 智能数据缓存
- **懒加载**: 图片和重型组件懒加载
- **CDN 优化**: 外部资源 CDN 加速

## 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90
- 移动端浏览器（iOS Safari, Chrome Mobile）

## 测试

```bash
# 运行单元测试
npm test

# 监听模式测试
npm run test:watch

# 代码格式检查
npm run lint

# 自动修复格式问题
npm run lint:fix

# HTML 结构验证
npm run validate

# 无障碍测试
npm run accessibility
```

## 部署

### 静态部署
构建后的文件可直接部署到任何静态文件服务器：

```bash
npm run build
# 将 dist/ 目录内容上传到服务器
```

### CDN 部署
推荐使用以下平台：
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

### Docker 部署

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范
- 使用 ESLint + Prettier 格式化代码
- 遵循 JavaScript Standard Style
- 编写有意义的提交信息
- 添加适当的注释和文档

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- 项目地址: https://github.com/scamsafe/frontend
- 问题反馈: https://github.com/scamsafe/frontend/issues
- 邮箱: team@scamsafe.org

## 更新日志

### v1.0.0 (2025-08-28)
- ✨ 初始版本发布
- ✨ 完整的威胁情报展示系统
- ✨ 响应式设计和无障碍支持
- ✨ 模块化组件架构
- ✨ 专业级用户界面

---

**注意**: 这是一个教育性的公益项目，旨在提高公众对网络诈骗的认识和防范能力。