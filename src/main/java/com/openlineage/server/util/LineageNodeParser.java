package com.openlineage.server.util;

import com.openlineage.server.storage.document.MarquezId;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class LineageNodeParser {

    public static MarquezId parseNodeId(String nodeId) {
        // format: type:namespace:name
        int firstColon = nodeId.indexOf(':');
        int lastColon = nodeId.lastIndexOf(':');
        
        if (firstColon == -1 || firstColon == lastColon) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid nodeId format");
        }
        
        String namespace = nodeId.substring(firstColon + 1, lastColon);
        String name = nodeId.substring(lastColon + 1);
        
        return new MarquezId(namespace, name);
    }

    public static String parseType(String nodeId) {
        int firstColon = nodeId.indexOf(':');
        int lastColon = nodeId.lastIndexOf(':');
        
        if (firstColon == -1 || firstColon == lastColon) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid nodeId format");
        }
        
        return nodeId.substring(0, firstColon);
    }
}
