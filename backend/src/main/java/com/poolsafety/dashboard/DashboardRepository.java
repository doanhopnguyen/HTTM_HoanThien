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
    public List<DashboardDto.Day> days(Instant from,String timezone) {
        return sql.query("SELECT to_char(created_at AT TIME ZONE ?, 'YYYY-MM-DD') AS day,count(*) AS total,count(*) FILTER(WHERE status='RESOLVED') AS resolved,count(*) FILTER(WHERE status='FALSE_ALARM') AS false_alarm FROM incidents WHERE created_at>=? GROUP BY day ORDER BY day",(r,i)->new DashboardDto.Day(r.getString("day"),r.getLong("total"),r.getLong("resolved"),r.getLong("false_alarm")),timezone,java.sql.Timestamp.from(from));
    }
    public List<DashboardDto.CameraCount> cameras(Instant from) {
        return sql.query("SELECT c.id,c.name,c.status,count(i.id) AS total FROM cameras c LEFT JOIN detection_events d ON d.camera_id=c.id LEFT JOIN incidents i ON i.detection_event_id=d.id AND i.created_at>=? GROUP BY c.id,c.name,c.status ORDER BY c.name",(r,i)->new DashboardDto.CameraCount(r.getString("id"),r.getString("name"),r.getString("status"),r.getLong("total")),java.sql.Timestamp.from(from));
    }
    public DashboardDto.Report report(Instant from) {
        return sql.queryForObject("SELECT count(*) AS total,count(*) FILTER(WHERE status='RESOLVED') AS resolved,count(*) FILTER(WHERE status='FALSE_ALARM') AS false_alarm,avg(extract(epoch FROM resolved_at-acknowledged_at)) FILTER(WHERE status='RESOLVED') AS average FROM incidents WHERE created_at>=?",(r,i)->new DashboardDto.Report(r.getLong("total"),r.getLong("resolved"),r.getLong("false_alarm"),(Double)r.getObject("average",Double.class)),java.sql.Timestamp.from(from));
    }
    private long n(java.util.Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
}
