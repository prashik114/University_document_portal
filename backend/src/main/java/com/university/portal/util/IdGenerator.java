package com.university.portal.util;

import java.util.UUID;

/**
 * Central ID-generation utilities.
 * All IDs are UUID-based to guarantee uniqueness across restarts and
 * concurrent requests — no more random-int collision window.
 */
public final class IdGenerator {

    private IdGenerator() {}

    /** Returns a short 8-char hex prefix of a UUID, e.g. {@code a3f1b2c4}. */
    public static String shortHex() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    /** Audit log ID: {@code AUD-<8hex>} */
    public static String auditId() {
        return "AUD-" + shortHex();
    }

    /** Revision request ID: {@code REV-<8hex>} */
    public static String revisionId() {
        return "REV-" + shortHex();
    }

    /** User ID: {@code USR-<8hex>} */
    public static String userId() {
        return "USR-" + shortHex();
    }
}
