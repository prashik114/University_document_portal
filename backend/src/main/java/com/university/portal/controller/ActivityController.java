package com.university.portal.controller;

import com.university.portal.entity.RecentActivityEntity;
import com.university.portal.repository.RecentActivityRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final RecentActivityRepository activityRepository;

    public ActivityController(RecentActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    @GetMapping
    public List<RecentActivityEntity> getRecent() {
        return activityRepository.findTop20ByOrderByIdDesc();
    }
}

