package com.university.portal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.util.List;

/**
 * Web MVC configuration:
 * <ul>
 *   <li>CORS — explicitly whitelisted origins only; {@code allowCredentials}
 *       is {@code false} since we have no cookie/session auth.</li>
 *   <li>Static resource handler for uploaded evidence files.</li>
 * </ul>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** Comma-separated extra allowed origins (injected from application.properties). */
    @Value("${portal.cors.extra-origins:}")
    private String extraOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // Only explicit, controlled origins — no wildcard sub-domain patterns
        config.setAllowedOrigins(buildAllowedOrigins());
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS","PATCH"));
        config.setExposedHeaders(List.of("Content-Disposition","X-Total-Count"));
        // No credentials (no cookies / sessions) — safe to be explicit
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(buildAllowedOrigins().toArray(String[]::new))
                .allowedMethods("GET","POST","PUT","DELETE","OPTIONS","PATCH")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File uploadDir = new File("uploads/evidence");
        if (!uploadDir.exists()) uploadDir.mkdirs();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir.getAbsolutePath() + "/");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<String> buildAllowedOrigins() {
        List<String> origins = new java.util.ArrayList<>(List.of(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:8080",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:8080"
        ));
        // Allow overriding/extending via config (e.g. production Vercel URL)
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            for (String o : extraOrigins.split(",")) {
                String trimmed = o.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }
        return origins;
    }
}
