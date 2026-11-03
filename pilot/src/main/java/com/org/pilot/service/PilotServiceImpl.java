package com.org.pilot.service;

import com.org.pilot.dto.*;
import com.org.pilot.exception.ResourceNotFoundException;
import com.org.pilot.model.Pilot;
import com.org.pilot.model.PilotStatus;
import com.org.pilot.model.PilotStatusLog;
import com.org.pilot.repository.PilotRepository;
import com.org.pilot.repository.PilotStatusLogRepository;
import com.org.pilot.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PilotServiceImpl implements PilotService {

    // 3-30 caractères: 7rouf, ar9am, . _ -
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,30}$");
    private static final int MIN_PASSWORD = 6;

    private final PilotRepository pilotRepository;
    private final PilotStatusLogRepository logRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Override
    public List<PilotDto> getAllPilots() {
        return pilotRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public PilotDto getPilotById(Long id) {
        return mapToDto(findPilot(id));
    }

    @Override
    public List<PilotLogDto> getPilotLogs(Long pilotId) {
        return logRepository.findByPilotIdOrderByStartTimeDesc(pilotId).stream()
                .map(log -> PilotLogDto.builder()
                        .id(log.getId())
                        .status(log.getStatus())
                        .startTime(log.getStartTime())
                        .endTime(log.getEndTime())
                        .durationSeconds(log.getDurationSeconds())
                        .build())
                .collect(Collectors.toList());
    }

    // ==========================================
    // 📝 INSCRIPTION (Username + Password)
    // ==========================================
    @Override
    @Transactional
    public PilotAuthResponse registerPilot(PilotRegisterRequest request) {
        String name = request.getName() == null ? "" : request.getName().trim();
        String username = normalize(request.getUsername());
        String password = request.getPassword() == null ? "" : request.getPassword();

        if (name.isEmpty()) throw new IllegalArgumentException("Le nom est obligatoire.");
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new IllegalArgumentException("Identifiant invalide (3 à 30 caractères : lettres, chiffres, . _ -).");
        }
        if (password.length() < MIN_PASSWORD) throw new IllegalArgumentException("Le mot de passe doit contenir au moins " + MIN_PASSWORD + " caractères.");
        if (pilotRepository.existsByUsername(username)) throw new IllegalArgumentException("Cet identifiant est déjà utilisé.");

        Pilot pilot = Pilot.builder()
                .name(name)
                .username(username)
                .password(passwordEncoder.encode(password))
                .status(PilotStatus.FIN_SERVICE) // Hors ligne 7ta ykhtar status
                .lastUpdated(LocalDateTime.now())
                .dailyPauseTime(0L)
                .lastActiveDate(LocalDate.now())
                .build();

        Pilot saved = pilotRepository.save(pilot);
        PilotDto dto = mapToDto(saved);
        messagingTemplate.convertAndSend("/topic/pilots", dto);

        return new PilotAuthResponse(jwtUtils.generatePilotToken(saved.getId()), dto);
    }

    // ==========================================
    // 🔐 LOGIN (Username + Password)
    // ==========================================
    @Override
    public PilotAuthResponse loginPilot(PilotLoginRequest request) {
        String raw = request.getUsername() == null ? "" : request.getUsername().trim();

        // Lowercase awalan, w ila makanch n9elbou b chkl l'asli (anciens comptes)
        Pilot pilot = pilotRepository.findByUsername(raw.toLowerCase())
                .or(() -> pilotRepository.findByUsername(raw))
                .orElseThrow(() -> new SecurityException("Identifiant ou mot de passe incorrect."));

        if (request.getPassword() == null || !passwordEncoder.matches(request.getPassword(), pilot.getPassword())) {
            throw new SecurityException("Identifiant ou mot de passe incorrect.");
        }

        return new PilotAuthResponse(jwtUtils.generatePilotToken(pilot.getId()), mapToDto(pilot));
    }

    @Override
    @Transactional
    public PilotDto updatePilotStatus(Long id, PilotStatusUpdateRequest request) {
        Pilot pilot = findPilot(id);
        PilotStatus newStatus = request.getStatus();
        if (newStatus == null) throw new IllegalArgumentException("Status obligatoire.");

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        if (pilot.getLastActiveDate() == null || !pilot.getLastActiveDate().isEqual(today)) {
            pilot.setDailyPauseTime(0L);
            pilot.setLastActiveDate(today);
            pilot.setPauseStartTime(null);
        }

        PilotStatus oldStatus = pilot.getStatus();
        if (oldStatus == newStatus) {
            return mapToDto(pilot); // Nfs status, walou
        }

        // Ila kan f pause (machi WORKING w machi FIN_SERVICE) → n7esbou l'mouda w nsjlou log
        boolean wasOnPause = oldStatus != null && oldStatus != PilotStatus.WORKING && oldStatus != PilotStatus.FIN_SERVICE;
        if (wasOnPause && pilot.getPauseStartTime() != null) {
            long secondsPassed = Duration.between(pilot.getPauseStartTime(), now).getSeconds();
            long currentTotal = pilot.getDailyPauseTime() != null ? pilot.getDailyPauseTime() : 0L;
            pilot.setDailyPauseTime(currentTotal + secondsPassed);

            logRepository.save(PilotStatusLog.builder()
                    .pilot(pilot)
                    .status(oldStatus)
                    .startTime(pilot.getPauseStartTime())
                    .endTime(now)
                    .durationSeconds(secondsPassed)
                    .build());
        }

        boolean isPause = newStatus != PilotStatus.WORKING && newStatus != PilotStatus.FIN_SERVICE;
        pilot.setPauseStartTime(isPause ? now : null);
        pilot.setStatus(newStatus);
        pilot.setLastUpdated(now);

        PilotDto dto = mapToDto(pilotRepository.save(pilot));
        messagingTemplate.convertAndSend("/topic/pilots", dto);
        return dto;
    }

    @Override
    @Transactional
    public PilotDto updatePilot(Long id, PilotUpdateRequest request) {
        Pilot pilot = findPilot(id);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            pilot.setName(request.getName().trim());
        }
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            String username = normalize(request.getUsername());
            if (!username.equals(pilot.getUsername())) { // Ghir ila tbdel
                if (!USERNAME_PATTERN.matcher(username).matches()) {
                    throw new IllegalArgumentException("Identifiant invalide (3 à 30 caractères : lettres, chiffres, . _ -).");
                }
                if (pilotRepository.existsByUsername(username)) throw new IllegalArgumentException("Cet identifiant est déjà utilisé.");
                pilot.setUsername(username);
            }
        }
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            if (request.getPassword().length() < MIN_PASSWORD) {
                throw new IllegalArgumentException("Le mot de passe doit contenir au moins " + MIN_PASSWORD + " caractères.");
            }
            pilot.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        PilotDto dto = mapToDto(pilotRepository.save(pilot));
        messagingTemplate.convertAndSend("/topic/pilots", dto);
        return dto;
    }

    @Override
    @Transactional
    public void deletePilot(Long id) {
        Pilot pilot = findPilot(id);
        logRepository.deleteAll(logRepository.findByPilotIdOrderByStartTimeDesc(id));
        pilotRepository.delete(pilot);
    }

    private Pilot findPilot(Long id) {
        return pilotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pilot not found with id: " + id));
    }

    private String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    private PilotDto mapToDto(Pilot pilot) {
        return PilotDto.builder()
                .id(pilot.getId())
                .name(pilot.getName())
                .username(pilot.getUsername())
                .status(pilot.getStatus())
                .lastUpdated(pilot.getLastUpdated())
                .dailyPauseTime(pilot.getDailyPauseTime() != null ? pilot.getDailyPauseTime() : 0L)
                .build();
    }
}