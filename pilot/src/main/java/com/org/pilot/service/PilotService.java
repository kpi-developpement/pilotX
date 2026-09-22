package com.org.pilot.service;

import com.org.pilot.dto.*;

import java.util.List;

public interface PilotService {
    List<PilotDto> getAllPilots();
    PilotDto getPilotById(Long id);
    PilotDto updatePilotStatus(Long id, PilotStatusUpdateRequest request);

    List<PilotLogDto> getPilotLogs(Long pilotId);

    PilotDto registerPilot(PilotRegisterRequest request);
    PilotDto loginPilot(PilotLoginRequest request);
    PilotDto webAuthnLogin(WebAuthnLoginRequest request); // Jdida

    PilotDto updatePilot(Long id, PilotUpdateRequest request);
    void deletePilot(Long id);
}