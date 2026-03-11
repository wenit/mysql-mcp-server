# MySQL MCP Server

一个基于 Node.js 的 MySQL MCP (Model Context Protocol) 服务器，支持通过 MCP 协议操作 MySQL 数据库。

## 功能特性

### 查询类工具
- **select / query** - 执行 SELECT 查询

### 修改类工具
- **insert** - 执行 INSERT 插入
- **update** - 执行 UPDATE 更新  
- **delete** - 执行 DELETE 删除
- **execute** - 通用执行（INSERT/UPDATE/DELETE）

### 批量操作工具
- **batch_execute** - 批量执行 SQL（自动使用事务）
- **batch_query** - 批量查询（只读）
- **batch_insert** - 批量插入

### 元数据工具
- **show_databases** - 获取所有数据库
- **list_tables** - 获取表列表
- **describe_table** - 获取表结构
- **show_indexes** - 获取表索引
- **show_create_table** - 获取建表语句

## 安全特性
- ✅ 参数化查询防止 SQL 注入
- ✅ DELETE/UPDATE 无 WHERE 条件时拒绝执行
- ✅ 支持只读模式 (`MYSQL_READONLY=true`)
- ✅ 批量操作自动使用事务

## 安装

### 通过 npm 安装（推荐）

```bash
# 全局安装
npm install -g @your-username/mysql-mcp-server

# 或在项目中安装
npm install @your-username/mysql-mcp-server
```

### 从源码安装

```bash
# 克隆或下载项目
cd mysql-mcp-server

# 安装依赖
npm install

# 编译 TypeScript
npm run build
```

## 配置

### 环境变量

创建 `.env` 文件或设置以下环境变量：

```bash
# 必需配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=test

# 可选配置
MYSQL_CONNECTION_LIMIT=10
MYSQL_READONLY=false

# SSL 配置（可选）
MYSQL_SSL_CA=/path/to/ca.pem
```

### Claude Desktop 配置

编辑 `claude_desktop_config.json`：

#### 方式一：使用 npx（推荐，无需全局安装）

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["-y", "@your-username/mysql-mcp-server"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "test",
        "MYSQL_READONLY": "false"
      }
    }
  }
}
```

#### 方式二：使用全局安装的包

**Windows:**
```json
{
  "mcpServers": {
    "mysql": {
      "command": "mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "test",
        "MYSQL_READONLY": "false"
      }
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "mysql": {
      "command": "mysql-mcp-server",
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "test"
      }
    }
  }
}
```

#### 方式三：使用本地路径

**Windows:**
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["E:\\path\\to\\mysql-mcp-server\\dist\\index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "test",
        "MYSQL_READONLY": "false"
      }
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/path/to/mysql-mcp-server/dist/index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "test"
      }
    }
  }
}
```

配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

## 使用示例

### 查询数据
```javascript
// 使用 select 工具
{
  "sql": "SELECT * FROM users WHERE age > ?",
  "params": [18]
}
```

### 插入数据
```javascript
// 使用 insert 工具
{
  "sql": "INSERT INTO users (name, email) VALUES (?, ?)",
  "params": ["张三", "zhangsan@example.com"]
}

// 或使用批量插入
{
  "table": "users",
  "records": [
    { "name": "张三", "email": "zs@example.com" },
    { "name": "李四", "email": "ls@example.com" }
  ]
}
```

### 更新数据
```javascript
// 使用 update 工具
{
  "sql": "UPDATE users SET age = ? WHERE id = ?",
  "params": [25, 1]
}
```

### 查看表结构
```javascript
// 使用 describe_table 工具
{
  "table": "users"
}
```

### 批量执行
```javascript
// 使用 batch_execute 工具
{
  "statements": [
    { "sql": "INSERT INTO logs (action) VALUES (?)", "params": ["login"] },
    { "sql": "UPDATE users SET last_login = NOW() WHERE id = ?", "params": [1] }
  ]
}
```

## 开发

```bash
# 开发模式（自动编译）
npm run dev

# 启动服务器
npm start

# 使用 MCP Inspector 测试
npm run inspector
```

## 注意事项

1. **安全性**：建议使用只读模式进行测试，避免误操作数据
2. **连接池**：默认连接池大小为 10，可通过 `MYSQL_CONNECTION_LIMIT` 调整
3. **超时**：默认连接超时为 60 秒，可通过 `MYSQL_TIMEOUT` 调整

## License

MIT
