'use strict';

function getInternalBaseUrl() {
  return process.env.INTERNAL_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
}

function getInternalHeaders() {
  return process.env.INTERNAL_SECRET
    ? { 'X-Internal-Secret': process.env.INTERNAL_SECRET }
    : {};
}

function buildInternalUrl(path) {
  return `${getInternalBaseUrl()}${path}`;
}

module.exports = {
  buildInternalUrl,
  getInternalHeaders,
};
