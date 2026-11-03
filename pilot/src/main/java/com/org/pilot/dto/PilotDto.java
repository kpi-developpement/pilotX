package com.org.pilot.dto;

import com.org.pilot.model.PilotStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PilotDto {
    private Long id;
    private String name;
    private String username;
    private PilotStatus status;
    private LocalDateTime lastUpdated;
    private Long dailyPauseTime;
    private Long secondsInStatus; // 7seb f serveur → walou mochkil dyal timezone
    private Boolean dayClosed;    // dar Fin de service lyouma → msdoud 7ta l'ghedda
}