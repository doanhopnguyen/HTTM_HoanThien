package com.poolsafety.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorResponse> domain(ApiException ex, HttpServletRequest r) {
        return response(ex.getStatus(), ex.getCode(), ex.getMessage(), r);
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest r) {
        var error = ex.getBindingResult().getFieldErrors().getFirst();
        return response(400, "VALIDATION_ERROR", error.getField() + ": " + error.getDefaultMessage(), r);
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ErrorResponse> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest r) {
        return response(400, "INVALID_REQUEST", "Invalid value for parameter '" + ex.getName() + "'", r);
    }
    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ErrorResponse> missingParameter(MissingServletRequestParameterException ex, HttpServletRequest r) {
        return response(400, "INVALID_REQUEST", "Missing required parameter '" + ex.getParameterName() + "'", r);
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> unreadable(HttpMessageNotReadableException ex, HttpServletRequest r) {
        return response(400, "INVALID_REQUEST", "Request body is missing or malformed", r);
    }
    @ExceptionHandler({ConstraintViolationException.class, IllegalArgumentException.class})
    ResponseEntity<ErrorResponse> badRequest(Exception ex, HttpServletRequest r) { return response(400, "INVALID_REQUEST", "Invalid request parameters", r); }
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorResponse> notFound(NoResourceFoundException ex, HttpServletRequest r) { return response(404, "NOT_FOUND", "Resource not found", r); }
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorResponse> method(HttpRequestMethodNotSupportedException ex, HttpServletRequest r) { return response(405, "METHOD_NOT_ALLOWED", "Method " + ex.getMethod() + " is not supported", r); }
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ErrorResponse> mediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest r) { return response(415, "UNSUPPORTED_MEDIA_TYPE", "Content type must be application/json", r); }
    @ExceptionHandler(PessimisticLockingFailureException.class)
    ResponseEntity<ErrorResponse> busy(Exception ex, HttpServletRequest r) { return response(409, "RESOURCE_BUSY", "Record is being updated by another request, try again", r); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict(Exception ex, HttpServletRequest r) { return response(409, "DUPLICATE_OR_CONFLICT", "Unique value already exists or record is referenced", r); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> forbidden(Exception ex, HttpServletRequest r) { return response(403, "FORBIDDEN", "Access denied", r); }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorResponse> uploadTooLarge(Exception ex, HttpServletRequest r) { return response(413,"FILE_TOO_LARGE","File exceeds the upload size limit",r); }
    @ExceptionHandler(org.springframework.web.multipart.support.MissingServletRequestPartException.class)
    ResponseEntity<ErrorResponse> missingUpload(Exception ex, HttpServletRequest r) { return response(400,"INVALID_FILE","Choose a file to upload",r); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest r) {
        log.error("Unhandled request failure at {}", r.getRequestURI(), ex);
        return response(500, "INTERNAL_ERROR", "An unexpected error occurred", r);
    }
    private ResponseEntity<ErrorResponse> response(int status, String code, String message, HttpServletRequest r) {
        return ResponseEntity.status(status).body(ErrorResponse.of(status, code, message, r.getRequestURI()));
    }
}
