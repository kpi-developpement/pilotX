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
    private PilotStatus status;
    private LocalDateTime lastUpdated;
    private Long dailyPauseTime; // Nzidouh hna bach ywsal l frontend
}