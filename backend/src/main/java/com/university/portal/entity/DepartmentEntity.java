package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "departments")
public class DepartmentEntity {

    @Id
    private String id; // e.g. "DEPT-CSE"

    @Column(nullable = false, unique = true)
    private String code; // e.g. "CSE"

    @Column(nullable = false, unique = true)
    private String name; // e.g. "Computer Science & Engineering"

    private String school; // e.g. "School of Computing & IT"
    private String hodId; // e.g. "USR-002"
    private String hodName; // e.g. "Prof. A. K. Verma"
    private String status = "Active"; // "Active", "Inactive"
    private String description;
    private String establishedYear = "2005";

    public DepartmentEntity() {}

    public DepartmentEntity(String id, String code, String name, String school, String hodId, String hodName, String status, String description, String establishedYear) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.school = school;
        this.hodId = hodId;
        this.hodName = hodName;
        this.status = status != null ? status : "Active";
        this.description = description;
        this.establishedYear = establishedYear != null ? establishedYear : "2005";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSchool() { return school; }
    public void setSchool(String school) { this.school = school; }

    public String getHodId() { return hodId; }
    public void setHodId(String hodId) { this.hodId = hodId; }

    public String getHodName() { return hodName; }
    public void setHodName(String hodName) { this.hodName = hodName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getEstablishedYear() { return establishedYear; }
    public void setEstablishedYear(String establishedYear) { this.establishedYear = establishedYear; }
}
