package com.org.pilot.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
public class AiServiceClient {

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper(); // ⚠️ THE FIX: Nkhdmo b Jackson direct

    // 🚀 1. Demander à l'IA de générer l'ADN Vocal
    public Map<String, Object> registerVoice(List<MultipartFile> audios, String employeeId) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("employeeId", employeeId);

        for (MultipartFile audio : audios) {
            body.add("audios", new ByteArrayResource(audio.getBytes()) {
                @Override
                public String getFilename() {
                    return audio.getOriginalFilename() != null ? audio.getOriginalFilename() : "audio.webm";
                }
            });
        }

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        // ⚠️ THE FIX: N-verifiw l'URL bach maykonch fih double slash
        String url = aiServiceUrl.endsWith("/") ? aiServiceUrl + "register" : aiServiceUrl + "/register";

        // ⚠️ THE FIX: N-st9blou String machi Map
        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

        String rawJson = response.getBody();
        System.out.println("🤖 [FASTAPI RESPONSE - REGISTER] : " + (rawJson != null ? rawJson.substring(0, Math.min(rawJson.length(), 100)) + "..." : "NULL"));

        if (rawJson == null || rawJson.trim().isEmpty()) {
            throw new RuntimeException("FastAPI a retourné une réponse vide !");
        }

        // N-7ewlou String l Map b yeddina
        return objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>(){});
    }

    // 🚀 2. Demander à l'IA d'identifier la voix
    public Map<String, Object> identifyVoice(MultipartFile audio, String challengeCode, String profilesJson) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("challenge_code", challengeCode);
        body.add("profiles_json", profilesJson);
        body.add("audio", new ByteArrayResource(audio.getBytes()) {
            @Override
            public String getFilename() {
                return audio.getOriginalFilename() != null ? audio.getOriginalFilename() : "ident.webm";
            }
        });

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        String url = aiServiceUrl.endsWith("/") ? aiServiceUrl + "identify" : aiServiceUrl + "/identify";
        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

        String rawJson = response.getBody();
        System.out.println("🤖 [FASTAPI RESPONSE - IDENTIFY] : " + rawJson);

        if (rawJson == null || rawJson.trim().isEmpty()) {
            throw new RuntimeException("FastAPI a retourné une réponse vide !");
        }

        return objectMapper.readValue(rawJson, new TypeReference<Map<String, Object>>(){});
    }
}