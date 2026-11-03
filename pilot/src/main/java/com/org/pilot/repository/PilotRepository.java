package com.org.pilot.repository;

import com.org.pilot.model.Pilot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PilotRepository extends JpaRepository<Pilot, Long> {
    Optional<Pilot> findByUsername(String username);
    boolean existsByUsername(String username);
}