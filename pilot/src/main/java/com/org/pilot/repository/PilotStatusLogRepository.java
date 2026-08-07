package com.org.pilot.repository;

import com.org.pilot.model.PilotStatusLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PilotStatusLogRepository extends JpaRepository<PilotStatusLog, Long> {
    // Njbdou les logs dyal pilot wahed mratbin b l'we9t jdid l 9dim
    List<PilotStatusLog> findByPilotIdOrderByStartTimeDesc(Long pilotId);
}