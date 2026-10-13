package com.example.constructionmanagement.exception;

import java.util.Map;

public record ValidationErrorResponse(int status, Map<String, String> errors) {
}
