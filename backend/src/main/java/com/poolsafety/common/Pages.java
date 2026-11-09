package com.poolsafety.common;

import org.springframework.data.domain.*;

public final class Pages {
    private Pages() {}
    /** Lower-cased LIKE pattern with \, % and _ escaped; use with escape character '\\'. */
    public static String likeTerm(String search) {
        return "%" + search.toLowerCase(java.util.Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
    public static Pageable of(int page, int size) {
        return of(page, size, Sort.Direction.DESC);
    }
    public static Pageable of(int page, int size, Sort.Direction direction) {
        if (page < 0 || size < 1 || size > 100) throw new ApiException(400, "INVALID_PAGE", "page >= 0 and size between 1 and 100 required");
        return PageRequest.of(page, size, Sort.by(direction, "createdAt").and(Sort.by("id")));
    }
}
