package com.org.pilot.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebAuthnLoginRequest {
    private String username;
    private String credentialId;
}