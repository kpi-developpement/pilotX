package com.org.pilot.service;

import com.org.pilot.dto.PilotDto;
import com.org.pilot.dto.PilotLogDto;
import com.org.pilot.dto.PilotStatusUpdateRequest;
import com.org.pilot.dto.PilotRegisterRequest;
import com.org.pilot.dto.PilotLoginRequest;
import com.org.pilot.dto.PilotUpdateRequest;

import java.util.List;

public interface PilotService {
    List<PilotDto> getAllPilots();
    PilotDto getPilotById(Long id);
    PilotDto updatePilotStatus(Long id, PilotStatusUpdateRequest request);

    List<PilotLogDto> getPilotLogs(Long pilotId);

    // Modifié pour accepter l'ADN vocal
    PilotDto registerPilot(PilotRegisterRequest request, String voiceProfileJson);
    PilotDto loginPilot(PilotLoginRequest request);

    PilotDto updatePilot(Long id, PilotUpdateRequest request);
    void deletePilot(Long id);

    // Nouvelle méthode pour récupérer la DB des voix
    String getAllVoiceProfilesJson();
}