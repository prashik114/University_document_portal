package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portal_users")
public class UserEntity {

    @Id
    private String id; // e.g. USR-001

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String role; // Faculty, DeanHOD, IQAC, Admin, Inspector

    private String roleTitle;
    private String designation;
    private String department;
    private String school;
    private String employeeId;
    private String avatar;
    private String badgeClass;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String status; // Active / Inactive

    public UserEntity() {}

    public UserEntity(String id, String name, String email, String role, String roleTitle,
                      String designation, String department, String school, String employeeId,
                      String avatar, String badgeClass, String description, String status) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.roleTitle = roleTitle;
        this.designation = designation;
        this.department = department;
        this.school = school;
        this.employeeId = employeeId;
        this.avatar = avatar;
        this.badgeClass = badgeClass;
        this.description = description;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getRoleTitle() { return roleTitle; }
    public void setRoleTitle(String roleTitle) { this.roleTitle = roleTitle; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getSchool() { return school; }
    public void setSchool(String school) { this.school = school; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getBadgeClass() { return badgeClass; }
    public void setBadgeClass(String badgeClass) { this.badgeClass = badgeClass; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

