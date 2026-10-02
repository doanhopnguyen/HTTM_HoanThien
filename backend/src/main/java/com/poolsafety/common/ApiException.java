package com.poolsafety.common;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {
    private final int status;
    private final String code;
    public ApiException(int status, String code, String message) { super(message); this.status = status; this.code = code; }
    public static ApiException missing(String entity) { return new ApiException(404, "NOT_FOUND", entity + " not found"); }
}
