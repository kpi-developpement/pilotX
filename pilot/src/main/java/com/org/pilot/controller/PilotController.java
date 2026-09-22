package com.org.pilot.controller;

import com.org.pilot.dto.*;
import com.org.pilot.service.PilotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pilots")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class PilotController {

    private final PilotService pilotService;

    @GetMapping
    public ResponseEntity<List<PilotDto>> getAllPilots() {
        return ResponseEntity.ok(pilotService.getAllPilots());
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<PilotLogDto>> getPilotLogs(@PathVariable Long id) {
        return ResponseEntity.ok(pilotService.getPilotLogs(id));
    }

    // ==========================================
    // 👆 CREATION D'UN PILOTE + WINDOWS HELLO
    // ==========================================
    @PostMapping("/register")
    public ResponseEntity<?> registerPilot(@RequestBody PilotRegisterRequest request) {
        try {
            PilotDto savedPilot = pilotService.registerPilot(request);
            return new ResponseEntity<>(savedPilot, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Server Error: " + e.getMessage());
        }
    }

    // ==========================================
    // 👆 POINTAGE WINDOWS HELLO (IDENTIFICATION)
    // ==========================================
    @PostMapping("/webauthn-login")
    public ResponseEntity<?> webAuthnLogin(@RequestBody WebAuthnLoginRequest request) {
        try {
            PilotDto pilot = pilotService.webAuthnLogin(request);
            return ResponseEntity.ok(pilot);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<PilotDto> loginPilot(@RequestBody PilotLoginRequest request) {
        return ResponseEntity.ok(pilotService.loginPilot(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PilotDto> updatePilotStatus(
            @PathVariable Long id,
            @RequestBody PilotStatusUpdateRequest request) {
        return ResponseEntity.ok(pilotService.updatePilotStatus(id, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePilotInfo(
            @PathVariable Long id,
            @RequestBody PilotUpdateRequest request) {
        try {
            return ResponseEntity.ok(pilotService.updatePilot(id, request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePilot(@PathVariable Long id) {
        try {
            pilotService.deletePilot(id);
            return ResponseEntity.ok("Pilot deleted successfully!");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}