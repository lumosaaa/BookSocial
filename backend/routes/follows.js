'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const followService = require('../services/followService');
const postService   = require('../services/postService');
const noteService   = require('../services/noteService');

// POST /api/v1/users/:id/follow
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const result = await followService.toggleFollow(req.user.id, +req.params.id);
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// GET /api/v1/users/:id/followers?page=&pageSize=
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await followService.getFollowers(
      +req.params.id, req.user?.id || null, +page, +pageSize
    );
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// GET /api/v1/users/:id/following?page=&pageSize=
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await followService.getFollowing(
      +req.params.id, req.user?.id || null, +page, +pageSize
    );
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// GET /api/v1/users/:id/posts?page=&pageSize=
router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await postService.getUserPosts(
      +req.params.id, req.user?.id || null, +page, +pageSize
    );
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// GET /api/v1/users/:id/notes?page=&pageSize=
router.get('/:id/notes', optionalAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await noteService.getUserNotes(
      +req.params.id, req.user?.id || null, +page, +pageSize
    );
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

module.exports = router;
