package com.openlineage.server.domain;

import com.openlineage.server.storage.document.MarquezId;

public class BfsNode {
    public final String type;
    public final MarquezId id;
    public final int depth;

    public BfsNode(String type, MarquezId id, int depth) {
        this.type = type;
        this.id = id;
        this.depth = depth;
    }
}
