package com.university.portal.dto;

/**
 * Login request payload — separates the raw JSON body from controller logic.
 */
public class LoginRequestDTO {

    private String email;
    private String password;
    private String otp;
    private String method; // "password" | "otp"

    public LoginRequestDTO() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
}
