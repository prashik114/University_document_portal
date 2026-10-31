package com.university.portal.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "recent_activities")
public class RecentActivityEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String icon;
    private String color;

    @Column(columnDefinition = "TEXT")
    private String title;

    private String timestamp;
    private String role;

    public RecentActivityEntity() {}

    public RecentActivityEntity(String icon, String color, String title, String timestamp, String role) {
        this.icon = icon;
        this.color = color;
        this.title = title;
        this.timestamp = timestamp;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}

