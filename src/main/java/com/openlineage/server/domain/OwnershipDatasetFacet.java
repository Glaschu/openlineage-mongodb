package com.openlineage.server.domain;

import java.util.List;

public record OwnershipDatasetFacet(
    List<Owner> owners
) implements Facet {
    public record Owner(String name, String type) {}
}
