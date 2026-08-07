package com.org.pilot.service;

import com.org.pilot.dto.PilotDto;
import com.org.pilot.dto.PilotLogDto;
import com.org.pilot.dto.PilotStatusUpdateRequest;
import com.org.pilot.dto.PilotRegisterRequest;
import com.org.pilot.dto.PilotLoginRequest;

import java.util.List;

public interface PilotService {
    List<PilotDto> getAllPilots();
    PilotDto getPilotById(Long id);
    PilotDto updatePilotStatus(Long id, PilotStatusUpdateRequest request);

    // Ajout jdid l'admin: njbdou historique d'kola pilot
    List<PilotLogDto> getPilotLogs(Long pilotId);

    PilotDto registerPilot(PilotRegisterRequest request);
    PilotDto loginPilot(PilotLoginRequest request);
}