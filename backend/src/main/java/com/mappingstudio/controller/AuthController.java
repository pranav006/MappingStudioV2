package com.mappingstudio.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${app.access-key}")
    private String accessKey;

    /** Validate access key. Frontend calls this on login; other /api calls are protected by AccessKeyFilter. */
    @PostMapping("/check")
    public ResponseEntity<?> check(@RequestBody Map<String, String> body) {
        String provided = body != null ? body.get("accessKey") : null;
        if (accessKey != null && accessKey.equals(provided)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(401).build();
    }
}
