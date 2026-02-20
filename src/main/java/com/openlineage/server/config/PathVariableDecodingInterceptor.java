package com.openlineage.server.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Interceptor that URL-decodes all @PathVariable values before they reach
 * controller methods.
 *
 * Required because WebConfig sets urlDecode(false) so that Spring can match
 * paths containing encoded slashes (%2F) in namespace URIs like s3://...
 * Without this interceptor, @PathVariable values arrive still URL-encoded
 * (e.g. "s3%3A%2F%2Fbucket") and don't match MongoDB stored values.
 */
@Component
public class PathVariableDecodingInterceptor implements HandlerInterceptor {

    @Override
    @SuppressWarnings("unchecked")
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Map<String, String> pathVariables = (Map<String, String>) request
                .getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

        if (pathVariables != null && !pathVariables.isEmpty()) {
            Map<String, String> decoded = new HashMap<>();
            pathVariables.forEach((key, value) -> decoded.put(key, URLDecoder.decode(value, StandardCharsets.UTF_8)));
            request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, decoded);
        }

        return true;
    }
}
