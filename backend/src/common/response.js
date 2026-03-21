/**
 * response.js
 * BookSocial 模块0 · 统一响应格式工具
 *
 * 所有 API 响应必须通过此模块输出，确保格式一致：
 * {
 *   code:      number,   // 业务状态码（200=成功，其余见下方枚举）
 *   message:   string,   // 可读提示信息
 *   data:      any,      // 响应数据（失败时为 null）
 *   timestamp: number,   // Unix 时间戳（毫秒）
 * }
 *
 * 分页响应额外包含：
 * {
 *   ...
 *   data: {
 *     list:       array,
 *     total:      number,
 *     page:       number,
 *     pageSize:   number,
 *     totalPages: number,
 *     hasMore:    boolean,
 *   }
 * }
 */

// ─── 业务状态码枚举 ──────────────────────────────────────────────────────────
const CODE = {
  SUCCESS:           200,
  CREATED:           201,
  BAD_REQUEST:       400,
  UNAUTHORIZED:      401,
  FORBIDDEN:         403,
  NOT_FOUND:         404,
  CONFLICT:          409,
  UNPROCESSABLE:     422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR:    500,
};

// ─── 基础响应构造器 ──────────────────────────────────────────────────────────

/**
 * 成功响应
 * @param {*} data
 * @param {string} [message]
 * @param {number} [code]
 */
function success(data = null, message = '操作成功', code = CODE.SUCCESS) {
  return { code, message, data, timestamp: Date.now() };
}

/**
 * 错误响应
 * @param {string} message
 * @param {number} [code]
 * @param {*} [data]
 */
function error(message = '操作失败', code = CODE.INTERNAL_ERROR, data = null) {
  return { code, message, data, timestamp: Date.now() };
}

/**
 * 分页响应
 * @param {Array} list
 * @param {number} total    - 总记录数
 * @param {number} page     - 当前页（从 1 开始）
 * @param {number} pageSize
 * @param {string} [message]
 */
function paginate(list, total, page, pageSize, message = '获取成功') {
  const totalPages = Math.ceil(total / pageSize);
  return {
    code: CODE.SUCCESS,
    message,
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    },
    timestamp: Date.now(),
  };
}

// ─── Express 响应快捷方法（挂载到 res 对象）─────────────────────────────────
// 在 app.js 中注册：app.use(responseHelper)

function responseHelper(req, res, next) {
  /**
   * res.ok(data, message?)
   */
  res.ok = function (data, message) {
    return res.status(200).json(success(data, message));
  };

  /**
   * res.created(data, message?)
   */
  res.created = function (data, message = '创建成功') {
    return res.status(201).json(success(data, message, CODE.CREATED));
  };

  /**
   * res.paginate(list, total, page, pageSize)
   */
  res.paginate = function (list, total, page, pageSize) {
    return res.status(200).json(paginate(list, total, page, pageSize));
  };

  /**
   * res.fail(message, code?, data?)
   */
  res.fail = function (message, code = 400, data) {
    return res.status(code).json(error(message, code, data));
  };

  /**
   * res.notFound(message?)
   */
  res.notFound = function (message = '资源不存在') {
    return res.status(404).json(error(message, CODE.NOT_FOUND));
  };

  /**
   * res.forbidden(message?)
   */
  res.forbidden = function (message = '无权限访问') {
    return res.status(403).json(error(message, CODE.FORBIDDEN));
  };

  next();
}

// ─── 全局错误处理中间件 ──────────────────────────────────────────────────────

/**
 * 404 兜底处理（放在所有路由之后）
 */
function notFoundHandler(req, res) {
  res.status(404).json(error(`接口不存在: ${req.method} ${req.path}`, CODE.NOT_FOUND));
}

/**
 * 全局异常处理（Express error middleware，必须有 4 个参数）
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // Joi / express-validator 校验错误
  if (err.name === 'ValidationError' || err.isJoi) {
    return res.status(422).json(error(err.message, CODE.UNPROCESSABLE));
  }

  // MySQL 唯一索引冲突
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(error('数据已存在，请勿重复提交', CODE.CONFLICT));
  }

  // JWT 错误（兜底，一般应由 authMiddleware 先处理）
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json(error('认证失败', CODE.UNAUTHORIZED));
  }

  // 开发环境暴露堆栈，生产环境隐藏
  const detail = process.env.NODE_ENV !== 'production' ? err.message : null;
  res.status(500).json(error('服务器内部错误', CODE.INTERNAL_ERROR, detail));
}

module.exports = {
  CODE,
  success,
  error,
  paginate,
  responseHelper,
  notFoundHandler,
  errorHandler,
};
