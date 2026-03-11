package com.openlineage.server.service;

import com.openlineage.server.domain.alation.AlationColumn;
import com.openlineage.server.domain.alation.AlationDataset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "alation.host")
public class AlationClientService {

    private static final Logger log = LoggerFactory.getLogger(AlationClientService.class);

    private final RestTemplate restTemplate;
    private final String alationHost;
    private final int pageSize;

    // Token management
    private final String refreshToken;
    private volatile String accessToken;

    public AlationClientService(RestTemplateBuilder restTemplateBuilder,
            @Value("${alation.host}") String alationHost,
            @Value("${alation.api-token:}") String apiToken,
            @Value("${alation.refresh-token:}") String refreshToken,
            @Value("${alation.page-size:100}") int pageSize) {
        this.alationHost = alationHost;
        this.pageSize = Math.min(pageSize, 1000); // Alation hard limit is 1000
        this.refreshToken = refreshToken;
        this.accessToken = apiToken;

        // Build a RestTemplate without a default Token header — we set it per-request
        // so that refreshed tokens are picked up automatically.
        this.restTemplate = restTemplateBuilder
                .rootUri(alationHost)
                .build();

        log.info("AlationClientService initialized with host: {}, pageSize: {}, refreshTokenConfigured: {}",
                alationHost, this.pageSize, (refreshToken != null && !refreshToken.isEmpty()));
    }

    // ── Public API ──────────────────────────────────────────────

    public List<AlationDataset> getDatasetsBySchema(Long schemaId) {
        if (schemaId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/dataset/")
                .queryParam("schema_id", schemaId)
                .queryParam("limit", pageSize)
                .toUriString();

        List<AlationDataset> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.debug("Fetched {} datasets for schemaId={}", results.size(), schemaId);
        return results;
    }

    public AlationDataset getDataset(Long datasetId) {
        if (datasetId == null) {
            return null;
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/dataset/")
                .queryParam("id", datasetId)
                .queryParam("limit", 1)
                .toUriString();

        try {
            ResponseEntity<List<AlationDataset>> response = executeWithAuth(
                    url, new ParameterizedTypeReference<>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null
                    && !response.getBody().isEmpty()) {
                return response.getBody().get(0);
            }
        } catch (Exception e) {
            log.error("Failed to fetch dataset from Alation for datasetId={}", datasetId, e);
        }
        return null;
    }

    public List<AlationColumn> getColumnsForDataset(Long datasetId) {
        if (datasetId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/column/")
                .queryParam("dataset_id", datasetId)
                .queryParam("limit", pageSize)
                .toUriString();

        List<AlationColumn> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.debug("Fetched {} columns for datasetId={}", results.size(), datasetId);
        return results;
    }

    public List<AlationColumn> getColumnsForSchema(Long schemaId) {
        if (schemaId == null) {
            return Collections.emptyList();
        }

        String url = UriComponentsBuilder.fromPath("/integration/v2/column/")
                .queryParam("schema_id", schemaId)
                .queryParam("limit", pageSize)
                .toUriString();

        List<AlationColumn> results = fetchAllPages(url, new ParameterizedTypeReference<>() {
        });
        log.debug("Fetched {} columns for schemaId={}", results.size(), schemaId);
        return results;
    }

    // ── Pagination ──────────────────────────────────────────────

    /**
     * Fetches all pages of results from an Alation API endpoint.
     * Alation paginates via the X-Next-Page response header which contains
     * the relative URL for the next page. When the header is absent, there
     * are no more pages.
     */
    private <T> List<T> fetchAllPages(String initialUrl, ParameterizedTypeReference<List<T>> typeRef) {
        List<T> allResults = new ArrayList<>();
        String currentUrl = initialUrl;

        try {
            while (currentUrl != null) {
                ResponseEntity<List<T>> response = executeWithAuth(currentUrl, typeRef);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    allResults.addAll(response.getBody());
                } else {
                    break;
                }

                // Alation returns the next page URL in the X-Next-Page header
                String nextPage = response.getHeaders().getFirst("X-Next-Page");
                if (nextPage != null && !nextPage.isEmpty()) {
                    // X-Next-Page is a relative path like /integration/v2/dataset/?skip=100&limit=100
                    currentUrl = nextPage;
                    log.debug("Following X-Next-Page: {}", nextPage);
                } else {
                    currentUrl = null;
                }
            }
        } catch (Exception e) {
            log.error("Error during paginated fetch starting from URL: {}", initialUrl, e);
        }

        return allResults;
    }

    // ── Auth & Request Execution ────────────────────────────────

    /**
     * Execute a GET request with the current access token. If a 401 is received
     * and a refresh token is configured, attempt to refresh the access token
     * and retry the request once.
     */
    private <T> ResponseEntity<T> executeWithAuth(String url, ParameterizedTypeReference<T> typeRef) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Token", accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            return restTemplate.exchange(url, HttpMethod.GET, entity, typeRef);
        } catch (HttpClientErrorException.Unauthorized e) {
            // 401 — try refreshing the token if we have a refresh token
            if (refreshToken != null && !refreshToken.isEmpty()) {
                log.info("Received 401 from Alation, attempting token refresh...");
                if (refreshAccessToken()) {
                    // Retry with the new token
                    HttpHeaders retryHeaders = new HttpHeaders();
                    retryHeaders.set("Token", accessToken);
                    HttpEntity<Void> retryEntity = new HttpEntity<>(retryHeaders);
                    return restTemplate.exchange(url, HttpMethod.GET, retryEntity, typeRef);
                }
            }
            throw e; // Re-throw if refresh not available or failed
        }
    }

    /**
     * Refresh the API access token using the long-lived refresh token.
     * Calls POST /integration/v1/createAPIAccessToken/ per Alation docs.
     *
     * @return true if the token was successfully refreshed
     */
    private synchronized boolean refreshAccessToken() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("refresh_token", refreshToken);
            body.add("user_id", "1"); // Admin user — can be made configurable if needed

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "/integration/v1/createAPIAccessToken/",
                    HttpMethod.POST,
                    request,
                    Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object token = response.getBody().get("api_access_token");
                if (token != null) {
                    this.accessToken = token.toString();
                    log.info("Alation API access token refreshed successfully");
                    return true;
                }
            }
            log.warn("Token refresh response did not contain api_access_token");
        } catch (Exception e) {
            log.error("Failed to refresh Alation API access token", e);
        }
        return false;
    }
}
