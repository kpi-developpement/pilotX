package com.org.pilot.config;

import com.org.pilot.model.Admin;
import com.org.pilot.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (adminRepository.count() == 0) {
            Admin admin = Admin.builder()
                    .username("fatini")
                    .password(passwordEncoder.encode("Htelgroupe")) // L'mot de passe dyalk db houwa admin123
                    .build();
            adminRepository.save(admin);
            System.out.println("Default Admin Account Created: fatini / Htelgroupe");
        }
    }
}