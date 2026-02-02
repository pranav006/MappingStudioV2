package com.mappingstudio.ai.training;

/**
 * Single row result from safe Excel parsing. All strings are already
 * trimmed and truncated to config limits; safe to pass to persistence.
 */
record SanitizedRow(String source, String target, String logic) {}
