/**
 * 数据修改类工具 - INSERT/UPDATE/DELETE
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeQuery, isReadOnlyQuery } from '../db/executor.js';
import { ExecutionMode } from '../types/index.js';
import { isReadOnly } from '../db/connection.js';

/**
 * 检查只读模式
 */
function checkReadOnly(): { allowed: boolean; error?: string } {
  if (isReadOnly()) {
    return {
      allowed: false,
      error: '当前处于只读模式，禁止执行 INSERT/UPDATE/DELETE 操作',
    };
  }
  return { allowed: true };
}

/**
 * 注册数据修改类工具
 */
export function registerModifyTools(server: McpServer): void {
  // INSERT 插入
  server.tool(
    'insert',
    '执行 INSERT 插入语句，向表中添加新数据',
    {
      sql: z.string().describe('INSERT SQL 语句'),
      params: z.array(z.any()).optional().describe('插入参数（用于参数化查询）'),
    },
    async ({ sql, params = [] }) => {
      // 检查只读模式
      const readOnlyCheck = checkReadOnly();
      if (!readOnlyCheck.allowed) {
        return {
          content: [{ type: 'text', text: readOnlyCheck.error! }],
          isError: true,
        };
      }

      // 验证是否为 INSERT 语句
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith('insert')) {
        return {
          content: [{ type: 'text', text: '错误：此工具只允许执行 INSERT 语句' }],
          isError: true,
        };
      }

      const result = await executeQuery(sql, params, ExecutionMode.READWRITE);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `插入失败：${result.error}` }],
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
                affectedRows: result.affectedRows,
                insertId: result.insertId,
                executionTime: `${result.executionTime}ms`,
                message: result.message,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // UPDATE 更新
  server.tool(
    'update',
    '执行 UPDATE 更新语句，修改表中现有数据',
    {
      sql: z.string().describe('UPDATE SQL 语句'),
      params: z.array(z.any()).optional().describe('更新参数（用于参数化查询）'),
    },
    async ({ sql, params = [] }) => {
      // 检查只读模式
      const readOnlyCheck = checkReadOnly();
      if (!readOnlyCheck.allowed) {
        return {
          content: [{ type: 'text', text: readOnlyCheck.error! }],
          isError: true,
        };
      }

      // 验证是否为 UPDATE 语句
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith('update')) {
        return {
          content: [{ type: 'text', text: '错误：此工具只允许执行 UPDATE 语句' }],
          isError: true,
        };
      }

      const result = await executeQuery(sql, params, ExecutionMode.READWRITE);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `更新失败：${result.error}` }],
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
                affectedRows: result.affectedRows,
                changedRows: result.changedRows,
                executionTime: `${result.executionTime}ms`,
                message: result.message,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // DELETE 删除
  server.tool(
    'delete',
    '执行 DELETE 删除语句，从表中删除数据',
    {
      sql: z.string().describe('DELETE SQL 语句'),
      params: z.array(z.any()).optional().describe('删除参数（用于参数化查询）'),
    },
    async ({ sql, params = [] }) => {
      // 检查只读模式
      const readOnlyCheck = checkReadOnly();
      if (!readOnlyCheck.allowed) {
        return {
          content: [{ type: 'text', text: readOnlyCheck.error! }],
          isError: true,
        };
      }

      // 验证是否为 DELETE 语句
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith('delete')) {
        return {
          content: [{ type: 'text', text: '错误：此工具只允许执行 DELETE 语句' }],
          isError: true,
        };
      }

      const result = await executeQuery(sql, params, ExecutionMode.READWRITE);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `删除失败：${result.error}` }],
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
                affectedRows: result.affectedRows,
                executionTime: `${result.executionTime}ms`,
                message: result.message,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 通用执行（支持所有 DML）
  server.tool(
    'execute',
    '执行任意 SQL 语句（INSERT/UPDATE/DELETE），请谨慎使用',
    {
      sql: z.string().describe('SQL 语句'),
      params: z.array(z.any()).optional().describe('参数（用于参数化查询）'),
    },
    async ({ sql, params = [] }) => {
      // 检查只读模式
      const readOnlyCheck = checkReadOnly();
      if (!readOnlyCheck.allowed) {
        return {
          content: [{ type: 'text', text: readOnlyCheck.error! }],
          isError: true,
        };
      }

      // 禁止 SELECT，使用 query 工具
      if (isReadOnlyQuery(sql)) {
        return {
          content: [{ type: 'text', text: '错误：SELECT 查询请使用 select 或 query 工具' }],
          isError: true,
        };
      }

      const result = await executeQuery(sql, params, ExecutionMode.READWRITE);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `执行失败：${result.error}` }],
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
                affectedRows: result.affectedRows,
                insertId: result.insertId,
                changedRows: result.changedRows,
                executionTime: `${result.executionTime}ms`,
                message: result.message,
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
