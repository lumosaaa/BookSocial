const express = require('express');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const { authMiddleware } = require('../common/authMiddleware');

// Cloudinary SDK 配置（从环境变量读取）
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/v1/upload/sign
 *
 * 为前端直传 Cloudinary 生成服务端签名。
 * 模块3（动态图片）、模块5（小组封面）直接调用此接口，禁止各自实现签名逻辑。
 *
 * Request Body（可选）：
 *   { "folder": "avatars" | "posts" | "groups" | "general" }
 *
 * Response data：
 *   { cloudName, apiKey, timestamp, signature, folder, uploadUrl }
 */
router.post('/sign', authMiddleware, (req, res) => {
  try {
    const folder    = req.body.folder || 'general';
    const timestamp = Math.round(Date.now() / 1000);

    // 需要签名的参数
    const paramsToSign = { folder, timestamp };

    // 头像：额外添加裁剪变换（200x200 人脸识别裁剪）
    if (folder === 'avatars') {
      paramsToSign.transformation = 'c_fill,w_200,h_200,g_face,q_auto,f_webp';
    }
    // 动态图片：自动质量压缩
    if (folder === 'posts' || folder === 'groups') {
      paramsToSign.transformation = 'q_auto,f_webp';
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.ok({
      cloudName:  process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:     process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    });
  } catch (err) {
    console.error('[Upload Sign Error]', err);
    res.fail('签名生成失败，请检查 Cloudinary 配置', 500);
  }
});

module.exports = router;
