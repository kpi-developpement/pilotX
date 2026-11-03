package com.org.pilot.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {

    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_PILOT = "PILOT";

    @Value("${app.jwtSecret:mySuperSecretKeyForPilotAppWhichNeedsToBeAtLeast256BitsLong123!}")
    private String jwtSecret;

    @Value("${app.jwtExpirationMs:86400000}") // 24 hours
    private int jwtExpirationMs;

    private Key key() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    // Token dyal l'Admin (b Spring AuthenticationManager)
    public String generateJwtToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        return generateToken(userPrincipal.getUsername(), ROLE_ADMIN);
    }

    // Token dyal l'Pilote: subject = id dyal pilote
    public String generatePilotToken(Long pilotId) {
        return generateToken(String.valueOf(pilotId), ROLE_PILOT);
    }

    private String generateToken(String subject, String role) {
        return Jwts.builder()
                .setSubject(subject)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    private Claims claims(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody();
    }

    public String getUserNameFromJwtToken(String token) {
        return claims(token).getSubject();
    }

    public String getRoleFromJwtToken(String token) {
        String role = claims(token).get("role", String.class);
        return role != null ? role : ROLE_ADMIN; // anciens tokens admin
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(authToken);
            return true;
        } catch (Exception e) {
            System.out.println("Invalid JWT Token: " + e.getMessage());
        }
        return false;
    }
}