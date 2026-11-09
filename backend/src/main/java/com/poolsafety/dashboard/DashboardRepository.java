package com.poolsafety.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import lombok.RequiredArgsConstructor;
import java.time.Instant;
import java.util.List;

@Repository @RequiredArgsConstructor
public class DashboardRepository {
    private final JdbcTemplate sql;
    public DashboardDto.Summary summary(Instant midnight,Instant tomorrow) {
        var cameras=sql.queryForMap("SELECT count(*) AS total,count(*) FILTER(WHERE status='ONLINE') AS online,count(*) FILTER(WHERE status='OFFLINE') AS offline,count(*) FILTER(WHERE monitoring_enabled) AS monitoring FROM cameras");
        var incidents=sql.queryForMap("SELECT count(*) FILTER(WHERE status IN ('NEW','ACKNOWLEDGED','IN_PROGRESS')) AS active,count(*) FILTER(WHERE created_at>=? AND created_at<?) AS today,count(*) FILTER(WHERE status='RESOLVED' AND resolved_at>=? AND resolved_at<?) AS resolved,count(*) FILTER(WHERE status='FALSE_ALARM' AND resolved_at>=? AND resolved_at<?) AS false_alarm FROM incidents",java.sql.Timestamp.from(midnight),java.sql.Timestamp.from(tomorrow),java.sql.Timestamp.from(midnight),java.sql.Timestamp.from(tomorrow),java.sql.Timestamp.from(midnight),java.sql.Timestamp.from(tomorrow));
        return new DashboardDto.Summary(n(cameras,"total"),n(cameras,"online"),n(cameras,"offline"),n(cameras,"monitoring"),n(incidents,"active"),n(incidents,"today"),n(incidents,"resolved"),n(incidents,"false_alarm"));
    }
    /** Per-day series including days without incidents (generate_series fills zeros). */
    public List<DashboardDto.Day> days(java.time.LocalDate first,java.time.LocalDate last,Instant from,String timezone) {
        return sql.query("""
            SELECT to_char(g.day,'YYYY-MM-DD') AS day,coalesce(a.total,0) AS total,coalesce(a.resolved,0) AS resolved,coalesce(a.false_alarm,0) AS false_alarm
            FROM generate_series(?::date,?::date,interval '1 day') AS g(day)
            LEFT JOIN (
                SELECT (created_at AT TIME ZONE ?)::date AS day,count(*) AS total,
                       count(*) FILTER(WHERE status='RESOLVED') AS resolved,count(*) FILTER(WHERE status='FALSE_ALARM') AS false_alarm
                FROM incidents WHERE created_at>=? GROUP BY 1
            ) a ON a.day=g.day::date
            ORDER BY g.day""",
            (r,i)->new DashboardDto.Day(r.getString("day"),r.getLong("total"),r.getLong("resolved"),r.getLong("false_alarm")),
            java.sql.Date.valueOf(first),java.sql.Date.valueOf(last),timezone,java.sql.Timestamp.from(from));
    }
    public List<DashboardDto.CameraCount> cameras(Instant from) {
        return sql.query("""
            SELECT c.id,c.name,c.status,count(i.id) FILTER(WHERE i.created_at>=?) AS total,
                   count(i.id) FILTER(WHERE i.created_at>=? AND i.status='RESOLVED') AS resolved,
                   count(i.id) FILTER(WHERE i.created_at>=? AND i.status='FALSE_ALARM') AS false_alarm,
                   count(i.id) FILTER(WHERE i.status IN ('NEW','ACKNOWLEDGED','IN_PROGRESS')) AS active
            FROM cameras c LEFT JOIN detection_events d ON d.camera_id=c.id LEFT JOIN incidents i ON i.detection_event_id=d.id
            GROUP BY c.id,c.name,c.status ORDER BY c.name""",
            (r,i)->new DashboardDto.CameraCount(r.getString("id"),r.getString("name"),r.getString("status"),r.getLong("total"),r.getLong("resolved"),r.getLong("false_alarm"),r.getLong("active")),
            java.sql.Timestamp.from(from),java.sql.Timestamp.from(from),java.sql.Timestamp.from(from));
    }
    public DashboardDto.Report report(Instant from) {
        return sql.queryForObject("""
            SELECT count(*) AS total,count(*) FILTER(WHERE status='RESOLVED') AS resolved,count(*) FILTER(WHERE status='FALSE_ALARM') AS false_alarm,
                   count(*) FILTER(WHERE status IN ('NEW','ACKNOWLEDGED','IN_PROGRESS')) AS active,
                   (avg(extract(epoch FROM resolved_at-acknowledged_at)) FILTER(WHERE status='RESOLVED' AND acknowledged_at IS NOT NULL))::float8 AS handling,
                   (avg(extract(epoch FROM acknowledged_at-created_at)) FILTER(WHERE acknowledged_at IS NOT NULL))::float8 AS response,
                   (avg(extract(epoch FROM resolved_at-created_at)) FILTER(WHERE resolved_at IS NOT NULL))::float8 AS resolution
            FROM incidents WHERE created_at>=?""",
            (r,i)->new DashboardDto.Report(r.getLong("total"),r.getLong("resolved"),r.getLong("false_alarm"),r.getLong("active"),
                r.getObject("handling",Double.class),r.getObject("response",Double.class),r.getObject("resolution",Double.class)),
            java.sql.Timestamp.from(from));
    }
    private long n(java.util.Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
}
