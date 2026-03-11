/**
 * 元数据相关工具 - 表结构、数据库列表等
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listDatabases, listTables, describeTable, showIndexes, showCreateTable } from '../db/executor.js';

/**
 * 注册元数据相关工具
 */
export function registerSchemaTools(server: McpServer): void {
  // 查看所有数据库
  server.tool(
    'show_databases',
    '获取 MySQL 服务器中的所有数据库列表',
    {},
    async () => {
      const result = await listDatabases();
      
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `错误：${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                databases: result.data?.map((row: any) => row.Database) || [],
                count: result.data?.length || 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 查看表列表
  server.tool(
    'list_tables',
    '获取指定数据库中的所有表信息',
    {
      database: z.string().optional().describe('数据库名称，不指定则使用默认数据库'),
    },
    async ({ database }) => {
      const result = await listTables(database);
      
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `错误：${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                database: database || process.env.MYSQL_DATABASE,
                tables: result.data || [],
                count: result.data?.length || 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 查看表结构
  server.tool(
    'describe_table',
    '获取指定表的详细结构信息，包括字段、类型、主键等',
    {
      table: z.string().describe('表名'),
    },
    async ({ table }) => {
      const result = await describeTable(table);
      
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `错误：${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                table,
                columns: result.data || [],
                columnCount: result.data?.length || 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 查看表索引
  server.tool(
    'show_indexes',
    '获取指定表的索引信息',
    {
      table: z.string().describe('表名'),
    },
    async ({ table }) => {
      const result = await showIndexes(table);
      
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `错误：${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                table,
                indexes: result.data || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 查看表创建语句
  server.tool(
    'show_create_table',
    '获取指定表的完整创建 SQL 语句',
    {
      table: z.string().describe('表名'),
    },
    async ({ table }) => {
      const result = await showCreateTable(table);
      
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `错误：${result.error}` }],
          isError: true,
        };
      }

      const row = result.data?.[0] as any;
      return {
        content: [
          {
            type: 'text',
            text: row?.['Create Table'] || row?.['Create View'] || '无创建语句',
          },
        ],
      };
    }
  );
}
