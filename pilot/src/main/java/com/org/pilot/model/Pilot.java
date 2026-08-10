package com.org.pilot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pilots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pilot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PilotStatus status;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @Column(name = "pause_start_time")
    private LocalDateTime pauseStartTime;

    @Column(name = "daily_pause_time")
    private Long dailyPauseTime;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    // 🧬 L'ADN Vocal (Stocké sous forme de JSON String dans la DB)
    @Column(name = "voice_profile", columnDefinition = "TEXT")
    private String voiceProfile;
}