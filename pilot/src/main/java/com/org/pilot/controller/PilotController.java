package com.org.pilot.controller;

import com.org.pilot.dto.*;
import com.org.pilot.exception.ResourceNotFoundException;
import com.org.pilot.service.PilotService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pilots")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class PilotController {

    private final PilotService pilotService;

    // ==========================================
    // 🔓 PUBLIC: Inscription + Login (Email / Password)
    // ==========================================
    @PostMapping("/register")
    public ResponseEntity<?> registerPilot(@RequestBody PilotRegisterRequest request) {
        try {
            return new ResponseEntity<>(pilotService.registerPilot(request), HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginPilot(@RequestBody PilotLoginRequest request) {
        try {
            return ResponseEntity.ok(pilotService.loginPilot(request));
        } catch (SecurityException e) {
            return error(HttpStatus.UNAUTHORIZED, e.getMessage());
        }
    }

    // ==========================================
    // 👤 PILOTE CONNECTÉ (token PILOT)
    // ==========================================
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        try {
            return ResponseEntity.ok(pilotService.getPilotById(currentPilotId(auth)));
        } catch (ResourceNotFoundException e) {
            return error(HttpStatus.UNAUTHORIZED, "Compte introuvable.");
        }
    }

    @PatchMapping("/me/status")
    public ResponseEntity<?> updateMyStatus(Authentication auth, @RequestBody PilotStatusUpdateRequest request) {
        try {
            return ResponseEntity.ok(pilotService.updatePilotStatus(currentPilotId(auth), request, false));
        } catch (ResourceNotFoundException e) {
            return error(HttpStatus.UNAUTHORIZED, "Compte introuvable.");
        } catch (IllegalStateException e) {
            return error(HttpStatus.CONFLICT, e.getMessage()); // Journée clôturée
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ==========================================
    // 🛡️ ADMIN (token ADMIN)
    // ==========================================
    @GetMapping
    public ResponseEntity<List<PilotDto>> getAllPilots() {
        return ResponseEntity.ok(pilotService.getAllPilots());
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<PilotLogDto>> getPilotLogs(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(pilotService.getPilotLogs(id, from, to));
    }

    // 📅 Historique dyal ga3 les pilotes (ex: ?from=2026-11-01&to=2026-11-30)
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        try {
            return ResponseEntity.ok(pilotService.getHistory(from, to));
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // L'admin y9der ybdel status (7ta ila nhar msdoud → débloquer)
    @PatchMapping("/{id}/status")
    public ResponseEntity<PilotDto> updatePilotStatus(@PathVariable Long id, @RequestBody PilotStatusUpdateRequest request) {
        return ResponseEntity.ok(pilotService.updatePilotStatus(id, request, true));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePilotInfo(@PathVariable Long id, @RequestBody PilotUpdateRequest request) {
        try {
            return ResponseEntity.ok(pilotService.updatePilot(id, request));
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePilot(@PathVariable Long id) {
        pilotService.deletePilot(id);
        return ResponseEntity.ok(Map.of("message", "Pilot deleted successfully!"));
    }

    private Long currentPilotId(Authentication auth) {
        return Long.valueOf(auth.getName());
    }

    private ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}