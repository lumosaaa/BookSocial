'use strict';

function verifyInternalSecret(req, res) {
  const configuredSecret = process.env.INTERNAL_SECRET;
  const requestSecret = req.headers['x-internal-secret'];

  if (!configuredSecret) {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        code: 500,
        message: '服务端未配置 INTERNAL_SECRET',
        data: null,
        timestamp: Date.now(),
      });
      return false;
    }
    return true;
  }

  if (requestSecret !== configuredSecret) {
    res.status(403).json({
      code: 403,
      message: '无权限',
      data: null,
      timestamp: Date.now(),
    });
    return false;
  }

  return true;
}

module.exports = { verifyInternalSecret };
