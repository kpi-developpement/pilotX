package com.org.pilot.service;

import com.org.pilot.dto.*;

import java.time.LocalDate;
import java.util.List;

public interface PilotService {
    List<PilotDto> getAllPilots();
    PilotDto getPilotById(Long id);

    // byAdmin = true → l'admin y9der ybdel status 7ta ila nhar msdoud
    PilotDto updatePilotStatus(Long id, PilotStatusUpdateRequest request, boolean byAdmin);

    List<PilotLogDto> getPilotLogs(Long pilotId, LocalDate from, LocalDate to);
    List<PilotLogDto> getHistory(LocalDate from, LocalDate to);

    PilotAuthResponse registerPilot(PilotRegisterRequest request);
    PilotAuthResponse loginPilot(PilotLoginRequest request);

    PilotDto updatePilot(Long id, PilotUpdateRequest request);
    void deletePilot(Long id);
}