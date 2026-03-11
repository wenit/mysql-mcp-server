/**
 * 查询类工具 - SELECT
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeQuery } from '../db/executor.js';
import { ExecutionMode } from '../types/index.js';

/**
 * 注册查询类工具
 */
export function registerQueryTools(server: McpServer): void {
  // SELECT 查询
  server.tool(
    'select',
    '执行 SELECT 查询语句，支持参数化查询以防止 SQL 注入',
    {
      sql: z.string().describe('SELECT SQL 语句'),
      params: z.array(z.any()).optional().describe('查询参数（用于参数化查询）'),
    },
    async ({ sql, params = [] }) => {
      // 验证是否为 SELECT 语句
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith('select') && !trimmed.startsWith('show') && !trimmed.startsWith('describe')) {
        return {
          content: [{ type: 'text', text: '错误：此工具只允许执行 SELECT/SHOW/DESCRIBE 查询' }],
          isError: true,
        };
      }

      const result = await executeQuery(sql, params, ExecutionMode.READWRITE);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `查询失败：${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                rowCount: result.data?.length || 0,
                executionTime: `${result.executionTime}ms`,
                data: result.data || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 简单查询（便捷方法）
  server.tool(
    'query',
    '执行任意查询（SELECT/SHOW/DESCRIBE），等同于 select 工具',
    {
      sql: z.string().describe('SQL 查询语句'),
      params: z.array(z.any()).optional().describe('查询参数'),
    },
    async ({ sql, params = [] }) => {
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith('select') && !trimmed.startsWith('show') && !trimmed.startsWith('describe')) {
        return {
          content: [{ type: 'text', text: '错误：此工具只允许执行 SELECT/SHOW/DESCRIBE 查询' }],
          isError: true,
        };
      }

      const result = await executeQuery(sql, params, ExecutionMode.READWRITE);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `查询失败：${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                rowCount: result.data?.length || 0,
                executionTime: `${result.executionTime}ms`,
                data: result.data || [],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
