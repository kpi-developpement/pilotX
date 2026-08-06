package com.org.pilot.service;

import com.org.pilot.dto.PilotDto;
import com.org.pilot.dto.PilotStatusUpdateRequest;
import com.org.pilot.dto.PilotRegisterRequest;
import com.org.pilot.dto.PilotLoginRequest;
import com.org.pilot.exception.ResourceNotFoundException;
import com.org.pilot.model.Pilot;
import com.org.pilot.model.PilotStatus;
import com.org.pilot.repository.PilotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PilotServiceImpl implements PilotService {

    private final PilotRepository pilotRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<PilotDto> getAllPilots() {
        return pilotRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public PilotDto getPilotById(Long id) {
        Pilot pilot = pilotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pilot not found with id: " + id));
        return mapToDto(pilot);
    }

    @Override
    @Transactional
    public PilotDto registerPilot(PilotRegisterRequest request) {
        if(pilotRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists!");
        }

        Pilot pilot = Pilot.builder()
                .name(request.getName())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .status(PilotStatus.WORKING)
                .lastUpdated(LocalDateTime.now())
                .dailyPauseTime(0L)
                .lastActiveDate(LocalDate.now())
                .build();

        Pilot savedPilot = pilotRepository.save(pilot);
        PilotDto savedPilotDto = mapToDto(savedPilot);

        messagingTemplate.convertAndSend("/topic/pilots", savedPilotDto);

        return savedPilotDto;
    }

    @Override
    public PilotDto loginPilot(PilotLoginRequest request) {
        Pilot pilot = pilotRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Pilot not found"));

        if (!passwordEncoder.matches(request.getPassword(), pilot.getPassword())) {
            throw new RuntimeException("Invalid password");
        }
        return mapToDto(pilot);
    }

    @Override
    @Transactional
    public PilotDto updatePilotStatus(Long id, PilotStatusUpdateRequest request) {
        Pilot pilot = pilotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pilot not found with id: " + id));

        LocalDate today = LocalDate.now();
        // Reset l'compteur dyal l'we9t ila dkhlna f nhar jdid
        if (pilot.getLastActiveDate() == null || !pilot.getLastActiveDate().isEqual(today)) {
            pilot.setDailyPauseTime(0L);
            pilot.setLastActiveDate(today);
            pilot.setPauseStartTime(null);
        }

        PilotStatus oldStatus = pilot.getStatus();
        PilotStatus newStatus = request.getStatus();

        // Ila kan f pause (ay no3) w bedel l'status dyalo (l WORKING wla pause khra)
        if (oldStatus != PilotStatus.WORKING && oldStatus != null && pilot.getPauseStartTime() != null) {
            long secondsPassed = Duration.between(pilot.getPauseStartTime(), LocalDateTime.now()).getSeconds();
            long currentTotal = pilot.getDailyPauseTime() != null ? pilot.getDailyPauseTime() : 0L;
            pilot.setDailyPauseTime(currentTotal + secondsPassed);
            pilot.setPauseStartTime(null);
        }

        // Ila l'status jdid houwa pause, n-markiw l'we9t dyal l'bidaya
        if (newStatus != PilotStatus.WORKING) {
            pilot.setPauseStartTime(LocalDateTime.now());
        }

        pilot.setStatus(newStatus);
        pilot.setLastUpdated(LocalDateTime.now());

        Pilot updatedPilot = pilotRepository.save(pilot);
        PilotDto updatedPilotDto = mapToDto(updatedPilot);

        messagingTemplate.convertAndSend("/topic/pilots", updatedPilotDto);

        return updatedPilotDto;
    }

    private PilotDto mapToDto(Pilot pilot) {
        return PilotDto.builder()
                .id(pilot.getId())
                .name(pilot.getName())
                .status(pilot.getStatus())
                .lastUpdated(pilot.getLastUpdated())
                .dailyPauseTime(pilot.getDailyPauseTime() != null ? pilot.getDailyPauseTime() : 0L)
                .build();
    }
}