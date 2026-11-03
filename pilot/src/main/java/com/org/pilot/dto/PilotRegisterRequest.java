package com.org.pilot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PilotRegisterRequest {
    private String name;
    private String email;
    private String password;
}