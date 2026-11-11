package com.poolsafety.media;

import com.poolsafety.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.io.IOException;
import java.util.*;

@Service
public class MediaStorage {
    private final Path root;
    public MediaStorage(@Value("${app.media-directory:.runtime/media}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }
    public record Asset(String id, String name) {}
    public Asset save(MultipartFile file, String kind) throws IOException {
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").replace('\\','/');
        name = name.substring(name.lastIndexOf('/') + 1);
        int dot = name.lastIndexOf('.');
        String extension = dot < 0 ? "" : name.substring(dot).toLowerCase(Locale.ROOT);
        Set<String> allowed = kind.equals("videos") ? Set.of(".mp4", ".webm", ".mov") : Set.of(".pt", ".onnx", ".pth");
        if (file.isEmpty() || !allowed.contains(extension))
            throw new ApiException(400,"INVALID_FILE","Choose a nonempty " + (kind.equals("videos") ? "MP4, WebM or MOV video" : "PT, PTH or ONNX checkpoint"));
        String id = UUID.randomUUID() + extension;
        Path target = root.resolve(kind).resolve(id);
        Files.createDirectories(target.getParent());
        try (var input = file.getInputStream()) { Files.copy(input, target); }
        catch (IOException e) { Files.deleteIfExists(target); throw e; }
        return new Asset(id, name);
    }
    public Path path(String kind, String id) {
        String extensions = kind.equals("videos") ? "mp4|webm|mov" : "pt|onnx|pth";
        if (id == null || !id.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(" + extensions + ")"))
            throw new ApiException(400,"INVALID_ASSET","Invalid uploaded file identifier");
        Path result = root.resolve(kind).resolve(id);
        if (!Files.isRegularFile(result)) throw ApiException.missing("Uploaded file");
        return result;
    }
}
