package com.openlineage.server.service;

import com.openlineage.server.storage.NamespaceRegistryDocument;
import com.openlineage.server.storage.NamespaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class GovernanceService {
    private static final Logger log = LoggerFactory.getLogger(GovernanceService.class);

    private final long cacheTtlMs;
    private final NamespaceRepository namespaceRepository;
    private final java.util.Map<String, CachedNamespace> cache = new java.util.concurrent.ConcurrentHashMap<>();

    public GovernanceService(NamespaceRepository namespaceRepository,
            @org.springframework.beans.factory.annotation.Value("${openlineage.governance.cache-ttl-ms:60000}") long cacheTtlMs) {
        this.namespaceRepository = namespaceRepository;
        this.cacheTtlMs = cacheTtlMs;
    }

    public void validateJobNamespaceOwnership(String namespace, String owner) {
        NamespaceRegistryDocument nsDoc = getCachedOrLoad(namespace);

        if (nsDoc != null) {
            // Check if Unclaimed
            if ("Unclaimed".equals(nsDoc.getOwnerTeam())) {
                // Take over ownership
                nsDoc.setOwnerTeam(owner);
                namespaceRepository.save(nsDoc);
                cache.put(namespace, new CachedNamespace(nsDoc, System.currentTimeMillis() + cacheTtlMs));
                log.info("User '{}' claimed ownership of namespace '{}'", owner, namespace);
            } else if (nsDoc.getOwnerTeam() != null && !nsDoc.getOwnerTeam().equals(owner)) {
                log.warn("Access Denied: Owner '{}' is not allowed for namespace '{}' (owned by '{}')", owner,
                        namespace, nsDoc.getOwnerTeam());
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        String.format("User '%s' is not authorized to access namespace '%s' owned by '%s'", owner,
                                namespace, nsDoc.getOwnerTeam()));
            }
        } else {
            // New namespace claiming
            NamespaceRegistryDocument newNs = new NamespaceRegistryDocument(
                    namespace,
                    owner, // Set owner from header
                    null,
                    false,
                    null);
            namespaceRepository.save(newNs);
            cache.put(namespace, new CachedNamespace(newNs, System.currentTimeMillis() + cacheTtlMs));
            log.info("Auto-registered new namespace '{}' with owner '{}'", namespace, owner);
        }
    }

    public void validateOrRegisterNamespace(String namespace, String producer) {
        NamespaceRegistryDocument nsDoc = getCachedOrLoad(namespace);

        if (nsDoc != null) {
            if (nsDoc.isLocked()) {
                if (nsDoc.getAllowedProducers() == null || !nsDoc.getAllowedProducers().contains(producer)) {
                    log.warn("Access Denied: Producer '{}' is not allowed for namespace '{}'", producer, namespace);
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            String.format("Producer '%s' is not allowed to write to locked namespace '%s'", producer,
                                    namespace));
                }
            }
        } else {
            NamespaceRegistryDocument newNs = new NamespaceRegistryDocument(
                    namespace,
                    "Unclaimed",
                    null,
                    false,
                    null);
            namespaceRepository.save(newNs);
            cache.put(namespace, new CachedNamespace(newNs, System.currentTimeMillis() + cacheTtlMs));
            log.info("Auto-registered new namespace: {}", namespace);
        }
    }

    private NamespaceRegistryDocument getCachedOrLoad(String namespace) {
        CachedNamespace cached = cache.get(namespace);
        if (cached != null && cached.expiry > System.currentTimeMillis()) {
            return cached.doc;
        }

        Optional<NamespaceRegistryDocument> docOpt = namespaceRepository.findById(namespace);
        if (docOpt.isPresent()) {
            NamespaceRegistryDocument doc = docOpt.get();
            cache.put(namespace, new CachedNamespace(doc, System.currentTimeMillis() + cacheTtlMs));
            return doc;
        }
        return null; // Not found
    }

    private static class CachedNamespace {
        NamespaceRegistryDocument doc;
        long expiry;

        CachedNamespace(NamespaceRegistryDocument doc, long expiry) {
            this.doc = doc;
            this.expiry = expiry;
        }
    }
}
