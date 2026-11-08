<?php

declare(strict_types=1);

/**
 * Hardened entry point.
 *
 * Identical routing to index.php, with an extra layer of transport and content
 * checks applied before the request reaches any handler. Use this as the web
 * server entry point in production; index.php remains the development entry.
 */

// Refuse to serve anything that is not routed through the gateway.
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

if ((($_SERVER['HTTPS'] ?? '') === 'on') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// Only the methods the API defines are accepted.
if (!in_array($method, ['GET', 'POST', 'OPTIONS'], true)) {
    http_response_code(405);
    header('Allow: GET, POST, OPTIONS');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => ['code' => 'method_not_allowed', 'message' => 'Method not allowed']]);
    exit;
}

// State-changing requests must be JSON. This blocks simple form-based CSRF.
if ($method === 'POST') {
    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if ($contentType !== '' && stripos($contentType, 'application/json') === false) {
        http_response_code(415);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => ['code' => 'unsupported_media_type', 'message' => 'Content-Type must be application/json']]);
        exit;
    }
}

require __DIR__ . '/index.php';
