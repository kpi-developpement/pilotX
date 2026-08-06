package com.org.pilot.controller;

import com.org.pilot.dto.PilotDto;
import com.org.pilot.dto.PilotStatusUpdateRequest;
import com.org.pilot.dto.PilotRegisterRequest;
import com.org.pilot.dto.PilotLoginRequest;
import com.org.pilot.service.PilotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pilots")
@CrossOrigin(originPatterns = "*") // HNA L'FIX ABROSKY
@RequiredArgsConstructor
public class PilotController {

    private final PilotService pilotService;

    @GetMapping
    public ResponseEntity<List<PilotDto>> getAllPilots() {
        return ResponseEntity.ok(pilotService.getAllPilots());
    }

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
}