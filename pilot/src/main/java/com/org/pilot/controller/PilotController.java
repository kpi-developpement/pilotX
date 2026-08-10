package com.org.pilot.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.org.pilot.dto.*;
import com.org.pilot.service.AiServiceClient;
import com.org.pilot.service.PilotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pilots")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class PilotController {

    private final PilotService pilotService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping
    public ResponseEntity<List<PilotDto>> getAllPilots() {
        return ResponseEntity.ok(pilotService.getAllPilots());
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<PilotLogDto>> getPilotLogs(@PathVariable Long id) {
        return ResponseEntity.ok(pilotService.getPilotLogs(id));
    }

    // ==========================================
    // 🎙️ CREATION D'UN PILOTE + ENREGISTREMENT VOCAL
    // ==========================================
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> registerPilotWithVoice(
            @RequestParam("name") String name,
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestPart("audios") List<MultipartFile> audios) {
        try {
            Map<String, Object> aiResponse = aiServiceClient.registerVoice(audios, username);

            // ⚠️ SAFETY CHECK
            if (aiResponse == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur: L'IA n'a pas répondu.");
            }

            if (aiResponse.get("success") == null || !(Boolean) aiResponse.get("success")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Voice AI failed: " + aiResponse.get("message"));
            }

            String voiceProfileJson = objectMapper.writeValueAsString(aiResponse.get("voice_profile"));

            PilotRegisterRequest request = new PilotRegisterRequest(name, username, password);
            PilotDto savedPilot = pilotService.registerPilot(request, voiceProfileJson);

            return new ResponseEntity<>(savedPilot, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Server Error: " + e.getMessage());
        }
    }

    // ==========================================
    // 🎙️ POINTAGE VOCAL (IDENTIFICATION)
    // ==========================================
    @PostMapping(value = "/voice-login", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> voiceLogin(
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("challenge_code") String challengeCode) {
        try {
            String profilesJson = pilotService.getAllVoiceProfilesJson();
            Map<String, Object> aiResponse = aiServiceClient.identifyVoice(audio, challengeCode, profilesJson);

            // ⚠️ SAFETY CHECK
            if (aiResponse == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "L'IA n'a pas répondu."));
            }

            if (aiResponse.get("success") != null && (Boolean) aiResponse.get("success")) {
                Long identifiedUserId = Long.valueOf(aiResponse.get("identified_user_id").toString());
                PilotDto pilot = pilotService.getPilotById(identifiedUserId);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "pilot", pilot,
                        "match_score", aiResponse.get("match_score"),
                        "message", "Authentification vocale réussie"
                ));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(aiResponse);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", "Erreur de communication avec l'IA: " + e.getMessage()));
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