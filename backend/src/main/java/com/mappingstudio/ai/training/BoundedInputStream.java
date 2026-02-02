package com.mappingstudio.ai.training;

import java.io.IOException;
import java.io.InputStream;

/**
 * Wraps an InputStream and throws after reading more than maxBytes.
 * Used so POI (and any other parser) never consumes more than the allowed
 * file size, even if the client sends a lying Content-Length.
 */
final class BoundedInputStream extends InputStream {

    private final InputStream in;
    private final long maxBytes;
    private long readSoFar = 0;

    BoundedInputStream(InputStream in, long maxBytes) {
        this.in = in;
        this.maxBytes = maxBytes;
    }

    @Override
    public int read() throws IOException {
        if (readSoFar >= maxBytes) {
            throw new SecurityException("Training file size limit exceeded");
        }
        int b = in.read();
        if (b >= 0) readSoFar++;
        return b;
    }

    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        if (readSoFar >= maxBytes) {
            throw new SecurityException("Training file size limit exceeded");
        }
        long remaining = maxBytes - readSoFar;
        int toRead = len;
        if (toRead > remaining) {
            toRead = (int) remaining;
        }
        int n = in.read(b, off, toRead);
        if (n > 0) readSoFar += n;
        return n;
    }

    @Override
    public void close() throws IOException {
        in.close();
    }
}
