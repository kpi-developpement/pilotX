package com.org.pilot.dto;

import com.org.pilot.model.PilotStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PilotStatusUpdateRequest {
    private PilotStatus status;
}