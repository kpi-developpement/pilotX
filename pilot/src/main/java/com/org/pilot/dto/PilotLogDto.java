package com.org.pilot.dto;

import com.org.pilot.model.PilotStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class PilotLogDto {
    private Long id;
    private PilotStatus status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long durationSeconds;
}