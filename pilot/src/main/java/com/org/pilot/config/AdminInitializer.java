package com.org.pilot.config;

import com.org.pilot.model.Admin;
import com.org.pilot.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:fatini}")
    private String adminUsername;

    @Value("${app.admin.password:Htelgroupe}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        // F koul démarrage: ila makaynch n-creyiwh, ila kayn n-resetiw l'mot de passe
        Admin admin = adminRepository.findByUsername(adminUsername)
                .orElseGet(() -> Admin.builder().username(adminUsername).build());

        admin.setPassword(passwordEncoder.encode(adminPassword));
        adminRepository.save(admin);

        System.out.println("✅ [PILOT-X] Admin prêt: " + adminUsername);
    }
}