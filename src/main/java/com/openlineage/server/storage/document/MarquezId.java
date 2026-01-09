package com.openlineage.server.storage.document;

import java.io.Serializable;

public class MarquezId implements Serializable {
    private String namespace;
    private String name;

    public MarquezId() {
    }

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

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        MarquezId marquezId = (MarquezId) o;
        return java.util.Objects.equals(namespace, marquezId.namespace) &&
                java.util.Objects.equals(name, marquezId.name);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(namespace, name);
    }

    @Override
    public String toString() {
        return "MarquezId{" +
                "namespace='" + namespace + '\'' +
                ", name='" + name + '\'' +
                '}';
    }
}
