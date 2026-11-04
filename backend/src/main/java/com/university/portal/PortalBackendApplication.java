package com.university.portal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;

@SpringBootApplication
public class PortalBackendApplication {
    public static void main(String[] args) {
        // Resolve project root so database path and uploads are consistent regardless of execution directory
        String userDir = System.getProperty("user.dir", ".");
        File rootDir = new File(userDir);
        if (rootDir.getName().equalsIgnoreCase("backend")) {
            rootDir = rootDir.getParentFile();
        }

        File dataDir = new File(rootDir, "data");
        if (!dataDir.exists()) {
            dataDir.mkdirs();
        }

        File uploadDir = new File(rootDir, "uploads/evidence");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        String dbPath = new File(dataDir, "portaldb").getAbsolutePath().replace('\\', '/');
        System.setProperty("PORTAL_DB_URL", "jdbc:h2:file:" + dbPath + ";DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE");
        System.setProperty("PORTAL_UPLOAD_DIR", uploadDir.getAbsolutePath().replace('\\', '/'));

        SpringApplication.run(PortalBackendApplication.class, args);
    }
}
