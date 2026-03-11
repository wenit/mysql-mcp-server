/**
 * SQL 执行器
 */
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool, getConnection, isReadOnly } from './connection.js';
import { QueryResult, BatchResult, ExecutionMode } from '../types/index.js';

/**
 * 判断 SQL 是否为只读查询
 */
export function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  // 只允许 SELECT 和 SHOW 语句
  return trimmed.startsWith('select') || trimmed.startsWith('show') || trimmed.startsWith('describe') || trimmed.startsWith('desc') || trimmed.startsWith('explain');
}

/**
 * 检查危险操作
 */
function checkDangerousOperation(sql: string): string | null {
  const trimmed = sql.trim().toLowerCase();
  
  // 检查 DELETE/UPDATE 没有 WHERE 子句
  if ((trimmed.startsWith('delete') || trimmed.startsWith('update')) && !trimmed.includes('where')) {
    return '危险操作：DELETE 或 UPDATE 语句缺少 WHERE 子句，拒绝执行';
  }
  
  return null;
}

/**
 * 执行 SQL 查询
 */
export async function executeQuery(
  sql: string,
  params?: any[],
  mode: ExecutionMode = ExecutionMode.READWRITE
): Promise<QueryResult> {
  const startTime = Date.now();
  
  try {
    // 检查只读模式
    if (mode === ExecutionMode.READONLY && !isReadOnlyQuery(sql)) {
      return {
        success: false,
        error: '当前处于只读模式，只允许执行 SELECT 查询',
      };
    }

    // 检查危险操作
    const dangerCheck = checkDangerousOperation(sql);
    if (dangerCheck) {
      return {
        success: false,
        error: dangerCheck,
      };
    }

    const pool = getPool();
    const [result] = await pool.execute(sql, params);
    const executionTime = Date.now() - startTime;

    // 判断结果类型
    if (Array.isArray(result)) {
      // SELECT 查询结果
      return {
        success: true,
        data: result as RowDataPacket[],
        executionTime,
      };
    } else {
      // INSERT/UPDATE/DELETE 结果
      const header = result as ResultSetHeader;
      return {
        success: true,
        affectedRows: header.affectedRows,
        insertId: header.insertId,
        changedRows: 'changedRows' in header ? header.changedRows : undefined,
        message: `执行成功，影响 ${header.affectedRows} 行`,
        executionTime,
      };
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      executionTime,
    };
  }
}

/**
 * 批量执行 SQL（事务）
 */
export async function executeBatch(
  statements: { sql: string; params?: any[] }[],
  mode: ExecutionMode = ExecutionMode.READWRITE
): Promise<BatchResult> {
  const startTime = Date.now();
  const results: QueryResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  // 检查只读模式
  if (mode === ExecutionMode.READONLY) {
    for (const stmt of statements) {
      if (!isReadOnlyQuery(stmt.sql)) {
        return {
          success: false,
          results: [],
          totalStatements: statements.length,
          successCount: 0,
          errorCount: statements.length,
          error: '当前处于只读模式，批量执行中包含非 SELECT 语句',
        };
      }
    }
  }

  const conn = await getConnection();
  
  try {
    // 开始事务
    await conn.beginTransaction();

    for (const { sql, params } of statements) {
      // 检查危险操作
      const dangerCheck = checkDangerousOperation(sql);
      if (dangerCheck) {
        await conn.rollback();
        conn.release();
        return {
          success: false,
          results,
          totalStatements: statements.length,
          successCount,
          errorCount: statements.length - successCount,
          error: dangerCheck,
        };
      }

      try {
        const [result] = await conn.execute(sql, params);
        
        if (Array.isArray(result)) {
          results.push({
            success: true,
            data: result as RowDataPacket[],
          });
        } else {
          const header = result as ResultSetHeader;
          results.push({
            success: true,
            affectedRows: header.affectedRows,
            insertId: header.insertId,
            changedRows: 'changedRows' in header ? header.changedRows : undefined,
            message: `执行成功，影响 ${header.affectedRows} 行`,
          });
        }
        successCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        results.push({
          success: false,
          error: errorMsg,
        });
        errorCount++;
        // 出错时回滚事务
        await conn.rollback();
        conn.release();
        return {
          success: false,
          results,
          totalStatements: statements.length,
          successCount,
          errorCount,
          error: `批量执行在第 ${results.length} 条语句失败：${errorMsg}`,
        };
      }
    }

    // 提交事务
    await conn.commit();
    
    const executionTime = Date.now() - startTime;
    results.forEach(r => r.executionTime = executionTime);

    return {
      success: true,
      results,
      totalStatements: statements.length,
      successCount,
      errorCount,
    };
  } catch (error) {
    await conn.rollback();
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    return {
      success: false,
      results,
      totalStatements: statements.length,
      successCount,
      errorCount: statements.length - successCount,
      error: `事务执行失败：${errorMsg}`,
    };
  } finally {
    conn.release();
  }
}

/**
 * 获取所有数据库列表
 */
export async function listDatabases(): Promise<QueryResult> {
  return executeQuery('SHOW DATABASES');
}

/**
 * 获取指定数据库的所有表
 */
export async function listTables(database?: string): Promise<QueryResult> {
  const db = database || process.env.MYSQL_DATABASE;
  if (!db) {
    return {
      success: false,
      error: '未指定数据库，请在参数中提供或设置 MYSQL_DATABASE 环境变量',
    };
  }
  
  const sql = `
    SELECT 
      table_name as \`name\`,
      engine,
      table_rows as \`rows\`,
      data_length as dataLength,
      create_time as createTime,
      update_time as updateTime,
      table_comment as comment
    FROM information_schema.tables
    WHERE table_schema = ?
    ORDER BY table_name
  `;
  
  return executeQuery(sql, [db]);
}

/**
 * 获取表结构
 */
export async function describeTable(table: string): Promise<QueryResult> {
  if (!table) {
    return {
      success: false,
      error: '表名不能为空',
    };
  }

  const sql = `
    SELECT 
      column_name as \`name\`,
      column_type as \`type\`,
      is_nullable as nullable,
      column_default as defaultValue,
      column_comment as comment,
      column_key = 'PRI' as isPrimaryKey,
      extra = 'auto_increment' as isAutoIncrement
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = ?
    ORDER BY ordinal_position
  `;
  
  return executeQuery(sql, [table]);
}

/**
 * 获取表索引信息
 */
export async function showIndexes(table: string): Promise<QueryResult> {
  if (!table) {
    return {
      success: false,
      error: '表名不能为空',
    };
  }

  return executeQuery(`SHOW INDEX FROM \`${table}\``);
}

/**
 * 获取表创建语句
 */
export async function showCreateTable(table: string): Promise<QueryResult> {
  if (!table) {
    return {
      success: false,
      error: '表名不能为空',
    };
  }

  return executeQuery(`SHOW CREATE TABLE \`${table}\``);
}
