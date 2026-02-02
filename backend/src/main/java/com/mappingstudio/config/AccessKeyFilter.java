package com.mappingstudio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Protects /api/* so only requests with the correct access key can use the app.
 * POST /api/auth/check is allowed without the key (so user can log in).
 * Other /api/* require header X-Access-Key or (for GET) query param accessKey.
 */
@Component
@Order(1)
public class AccessKeyFilter implements Filter {

    @Value("${app.access-key}")
    private String accessKey;

    private static final String AUTH_CHECK_PATH = "/api/auth/check";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        // Allow CORS preflight without key
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        // Allow login endpoint without key (normalize path: strip trailing slash)
        String normalizedPath = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
        if (AUTH_CHECK_PATH.equals(normalizedPath) && "POST".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String provided = req.getHeader("X-Access-Key");
        if (provided == null && "GET".equalsIgnoreCase(req.getMethod())) {
            provided = req.getParameter("accessKey");
        }
        if (accessKey != null && accessKey.equals(provided)) {
            chain.doFilter(request, response);
            return;
        }

        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"Invalid or missing access key\"}");
    }
}
