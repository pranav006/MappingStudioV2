package com.mappingstudio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.cors-allowed-origins}")
    private String corsAllowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = corsAllowedOrigins == null || corsAllowedOrigins.isBlank()
                ? new String[0]
                : corsAllowedOrigins.split("\\s*,\\s*");
        var mapping = registry.addMapping("/api/**")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
        if (origins.length > 0) {
            mapping.allowedOriginPatterns(origins);
        } else {
            mapping.allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
        }
    }
}
