package com.university.portal.dto;

import com.university.portal.entity.UserEntity;

/**
 * Login success response — returns a sanitised user object (no password).
 */
public class LoginResponseDTO {

    private boolean authenticated;
    private UserEntity user;
    private String message;

    public LoginResponseDTO() {}

    public LoginResponseDTO(boolean authenticated, UserEntity user, String message) {
        this.authenticated = authenticated;
        this.user = user;
        this.message = message;
    }

    public boolean isAuthenticated() { return authenticated; }
    public void setAuthenticated(boolean authenticated) { this.authenticated = authenticated; }

    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
