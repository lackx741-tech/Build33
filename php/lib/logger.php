<?php

declare(strict_types=1);

namespace Blower\Support;

/** Leveled logger writing structured lines to stderr (captured by the supervisor). */
final class Logger
{
    private static string $level = 'info';
    private static array $order = ['debug' => 0, 'info' => 1, 'warn' => 2, 'error' => 3];

    public static function configure(string $level): void
    {
        self::$level = isset(self::$order[$level]) ? $level : 'info';
    }

    public static function debug(string $message, array $context = []): void
    {
        self::write('debug', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('info', $message, $context);
    }

    public static function warn(string $message, array $context = []): void
    {
        self::write('warn', $message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('error', $message, $context);
    }

    private static function write(string $level, string $message, array $context): void
    {
        if (self::$order[$level] < self::$order[self::$level]) {
            return;
        }
        $line = sprintf(
            '%s %s: %s%s',
            date('Y-m-d H:i:s'),
            strtoupper($level),
            $message,
            $context === [] ? '' : ' ' . json_encode($context),
        );
        file_put_contents('php://stderr', $line . PHP_EOL);
    }
}
