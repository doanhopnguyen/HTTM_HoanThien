package com.poolsafety.common;

import org.springframework.data.domain.*;

public final class Pages {
    private Pages() {}
    public static Pageable of(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(400, "INVALID_PAGE", "page >= 0 and size between 1 and 100 required");
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id")));
    }
}
