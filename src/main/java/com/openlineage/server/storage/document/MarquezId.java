package com.openlineage.server.storage.document;

import java.io.Serializable;

public class MarquezId implements Serializable {
    private String namespace;
    private String name;

    public MarquezId() {}

    public MarquezId(String namespace, String name) {
        this.namespace = namespace;
        this.name = name;
    }

    public String getNamespace() {
        return namespace;
    }

    public void setNamespace(String namespace) {
        this.namespace = namespace;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
