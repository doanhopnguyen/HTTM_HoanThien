package com.poolsafety.common;

import java.net.URI;

public final class MediaUrls {
    private MediaUrls() {}
    public static void validate(String value,boolean stream) {
        if(value==null || value.isBlank())return;
        try {
            var uri=URI.create(value);var scheme=uri.getScheme();
            if(uri.getHost()==null || !("https".equals(scheme)||"http".equals(scheme)||(stream&&"rtsp".equals(scheme))))throw new IllegalArgumentException();
        }catch(IllegalArgumentException e){throw new ApiException(400,"INVALID_MEDIA_URL","Media URL must be an absolute HTTP(S) URL; camera sources may also use RTSP");}
    }
    public static String playable(String value) {
        if(value==null||value.isBlank())return null;
        var uri=URI.create(value);
        return uri.getUserInfo()!=null || "rtsp".equals(uri.getScheme()) ? null : value;
    }
    public static String masked(String value) {
        if(value==null||value.isBlank())return null;
        var uri=URI.create(value);
        // Do not expose credentials or query-string access tokens in labels.
        return uri.getScheme()+"://"+uri.getHost()+(uri.getPort()>0?":"+uri.getPort():"")+uri.getPath();
    }
}
