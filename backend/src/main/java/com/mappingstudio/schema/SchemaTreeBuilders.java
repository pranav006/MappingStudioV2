package com.mappingstudio.schema;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Builds schema tree (same format as EDI: title, key, children, isLeaf) from:
 * JSON sample, XSD, CSV sample, or Excel spec (field name, datatype, requirement).
 */
public final class SchemaTreeBuilders {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final int MAX_DEPTH = 20;
    private static final int MAX_LEAVES = 2000;
    private static final Pattern SAFE_KEY = Pattern.compile("[^a-zA-Z0-9_.]");

    /** Build tree from JSON sample (object keys → nodes; nested objects → children). */
    public static List<Map<String, Object>> fromJsonSample(InputStream in) throws Exception {
        byte[] raw = in.readAllBytes();
        int start = stripBomOffset(raw);
        byte[] clean = start == 0 ? raw : Arrays.copyOfRange(raw, start, raw.length);
        Object root = MAPPER.readValue(clean, Object.class);
        List<Map<String, Object>> tree = new ArrayList<>();
        int[] count = { 0 };
        buildJsonNode(tree, root, "", "root", 0, count);
        return tree;
    }

    @SuppressWarnings("unchecked")
    private static void buildJsonNode(List<Map<String, Object>> siblings, Object value, String path, String nodeKey, int depth, int[] count) {
        if (depth >= MAX_DEPTH || count[0] >= MAX_LEAVES) return;
        if (value == null) {
            addLeaf(siblings, path, nodeKey, nodeKey, "null");
            count[0]++;
            return;
        }
        if (value instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) value;
            if (map.isEmpty()) {
                addLeaf(siblings, path, nodeKey, nodeKey, "(empty object)");
                count[0]++;
                return;
            }
            List<Map<String, Object>> children = new ArrayList<>();
            for (Map.Entry<String, Object> e : map.entrySet()) {
                String k = e.getKey();
                String safeKey = SAFE_KEY.matcher(k).replaceAll("_");
                String childPath = path.isEmpty() ? k : path + "." + k;
                buildJsonNode(children, e.getValue(), childPath, safeKey, depth + 1, count);
            }
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("title", nodeKey + " (object)");
            node.put("key", path.isEmpty() ? nodeKey : path);
            node.put("children", children);
            node.put("isLeaf", false);
            siblings.add(node);
            return;
        }
        if (value instanceof List) {
            List<?> list = (List<?>) value;
            if (list.isEmpty()) {
                addLeaf(siblings, path, nodeKey, path.isEmpty() ? nodeKey : path, "(empty array)");
                count[0]++;
                return;
            }
            Object first = list.get(0);
            if (first instanceof Map) {
                List<Map<String, Object>> children = new ArrayList<>();
                buildJsonNode(children, first, path.isEmpty() ? nodeKey : path, nodeKey + "[0]", depth + 1, count);
                Map<String, Object> node = new LinkedHashMap<>();
                node.put("title", nodeKey + " (array)");
                node.put("key", path.isEmpty() ? nodeKey : path);
                node.put("children", children);
                node.put("isLeaf", false);
                siblings.add(node);
            } else {
                addLeaf(siblings, path, nodeKey, path.isEmpty() ? nodeKey : path, value.toString());
                count[0]++;
            }
            return;
        }
        addLeaf(siblings, path, nodeKey, path.isEmpty() ? nodeKey : path, value.toString());
        count[0]++;
    }

    private static void addLeaf(List<Map<String, Object>> siblings, String path, String nodeKey, String key, String hint) {
        Map<String, Object> leaf = new LinkedHashMap<>();
        leaf.put("title", nodeKey + (hint != null && !hint.isEmpty() ? " • " + (hint.length() > 30 ? hint.substring(0, 27) + "…" : hint) : ""));
        leaf.put("key", key);
        leaf.put("isLeaf", true);
        siblings.add(leaf);
    }

    /** Build tree from CSV sample (first row = headers, each column = leaf). */
    public static List<Map<String, Object>> fromCsvSample(InputStream in) throws Exception {
        byte[] raw = in.readAllBytes();
        int start = stripBomOffset(raw);
        String content = new String(start == 0 ? raw : Arrays.copyOfRange(raw, start, raw.length), StandardCharsets.UTF_8);
        String[] lines = content.split("[\r\n]+");
        if (lines.length == 0) return Collections.emptyList();
        String first = lines[0];
        String sep = first.contains("\t") ? "\t" : ",";
        String[] headers = parseCsvLine(first, sep);
        List<Map<String, Object>> root = new ArrayList<>();
        for (int i = 0; i < headers.length && root.size() < MAX_LEAVES; i++) {
            String h = headers[i].trim();
            if (h.isEmpty()) h = "field_" + (i + 1);
            String key = SAFE_KEY.matcher(h).replaceAll("_");
            Map<String, Object> leaf = new LinkedHashMap<>();
            leaf.put("title", h);
            leaf.put("key", key);
            leaf.put("isLeaf", true);
            root.add(leaf);
        }
        return root;
    }

    private static String[] parseCsvLine(String line, String sep) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') inQuotes = !inQuotes;
            else if (!inQuotes && (sep.indexOf(c) >= 0)) {
                out.add(cur.toString().trim());
                cur = new StringBuilder();
            } else cur.append(c);
        }
        out.add(cur.toString().trim());
        return out.toArray(new String[0]);
    }

    /** BOMs that cause "Content is not allowed in prolog" or JSON parse errors. */
    private static final byte[] UTF8_BOM = new byte[] { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF };
    private static final byte[] UTF16_BE_BOM = new byte[] { (byte) 0xFE, (byte) 0xFF };
    private static final byte[] UTF16_LE_BOM = new byte[] { (byte) 0xFF, (byte) 0xFE };

    /** Strip BOM and leading non-XML bytes so parser does not see "Content is not allowed in prolog". */
    private static byte[] stripXmlPrologBom(byte[] raw) {
        if (raw == null || raw.length == 0) return raw;
        int start = stripBomOffset(raw);
        // Skip leading whitespace (space, tab, CR, LF) before <?xml
        while (start < raw.length && (raw[start] == ' ' || raw[start] == '\t' || raw[start] == '\r' || raw[start] == '\n')) {
            start++;
        }
        // If still no <?xml at start, search for it (handles other prolog junk)
        if (start < raw.length && (raw.length - start < 5
                || raw[start] != '<' || raw[start + 1] != '?' || raw[start + 2] != 'x' || raw[start + 3] != 'm' || raw[start + 4] != 'l')) {
            int idx = indexOf(raw, "<?xml", start);
            if (idx >= 0) start = idx;
        }
        // If still not starting with '<', skip to first '<' (handles single stray byte)
        if (start < raw.length && raw[start] != '<') {
            for (int i = start + 1; i < raw.length; i++) {
                if (raw[i] == '<') { start = i; break; }
            }
        }
        if (start == 0) return raw;
        byte[] out = new byte[raw.length - start];
        System.arraycopy(raw, start, out, 0, out.length);
        return out;
    }

    /** Strip BOM only; return start offset (0 if no BOM). */
    private static int stripBomOffset(byte[] raw) {
        if (raw == null || raw.length == 0) return 0;
        if (raw.length >= UTF8_BOM.length
                && raw[0] == UTF8_BOM[0] && raw[1] == UTF8_BOM[1] && raw[2] == UTF8_BOM[2]) {
            return UTF8_BOM.length;
        }
        if (raw.length >= UTF16_BE_BOM.length
                && raw[0] == UTF16_BE_BOM[0] && raw[1] == UTF16_BE_BOM[1]) {
            return UTF16_BE_BOM.length;
        }
        if (raw.length >= UTF16_LE_BOM.length
                && raw[0] == UTF16_LE_BOM[0] && raw[1] == UTF16_LE_BOM[1]) {
            return UTF16_LE_BOM.length;
        }
        return 0;
    }

    private static int indexOf(byte[] haystack, String needle, int from) {
        byte[] n = needle.getBytes(StandardCharsets.UTF_8);
        if (from < 0 || n.length == 0 || from + n.length > haystack.length) return -1;
        for (int i = from; i <= haystack.length - n.length; i++) {
            boolean match = true;
            for (int j = 0; j < n.length; j++) {
                if (haystack[i + j] != n[j]) { match = false; break; }
            }
            if (match) return i;
        }
        return -1;
    }

    /** Normalize to UTF-8 so parser never sees UTF-16 null bytes (which cause "Content is not allowed in prolog"). */
    private static byte[] xmlToUtf8(byte[] raw) {
        if (raw == null || raw.length == 0) return raw;
        int start = 0;
        Charset cs = StandardCharsets.UTF_8;
        if (raw.length >= UTF8_BOM.length
                && raw[0] == UTF8_BOM[0] && raw[1] == UTF8_BOM[1] && raw[2] == UTF8_BOM[2]) {
            start = UTF8_BOM.length;
        } else if (raw.length >= UTF16_LE_BOM.length
                && raw[0] == UTF16_LE_BOM[0] && raw[1] == UTF16_LE_BOM[1]) {
            start = UTF16_LE_BOM.length;
            cs = StandardCharsets.UTF_16LE;
        } else if (raw.length >= UTF16_BE_BOM.length
                && raw[0] == UTF16_BE_BOM[0] && raw[1] == UTF16_BE_BOM[1]) {
            start = UTF16_BE_BOM.length;
            cs = StandardCharsets.UTF_16BE;
        } else if (raw.length >= 4 && raw[0] == '<' && raw[1] == 0 && raw[2] == '?' && raw[3] == 0) {
            // No BOM but content is UTF-16 LE (3C 00 3F 00 78 00 6D 00 6C 00 = <?xml)
            cs = StandardCharsets.UTF_16LE;
        } else if (raw.length >= 4 && raw[0] == 0 && raw[1] == '<' && raw[2] == 0 && raw[3] == '?') {
            // No BOM but content is UTF-16 BE
            cs = StandardCharsets.UTF_16BE;
        }
        if (cs != StandardCharsets.UTF_8) {
            String s = new String(raw, start, raw.length - start, cs);
            return s.getBytes(StandardCharsets.UTF_8);
        }
        return stripXmlPrologBom(raw);
    }

    /** Build tree from XSD (extract xs:element name attributes as leaf nodes). */
    public static List<Map<String, Object>> fromXsd(InputStream in) throws Exception {
        byte[] raw = in.readAllBytes();
        // Normalize to UTF-8 and strip BOM/junk so parser never sees "Content is not allowed in prolog"
        byte[] xml = xmlToUtf8(raw);
        javax.xml.parsers.DocumentBuilderFactory f = javax.xml.parsers.DocumentBuilderFactory.newInstance();
        f.setNamespaceAware(true);
        // Disable external entities and DTD loading to avoid network calls and parse failures (e.g. 834.xsd)
        try {
            f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false);
        } catch (Exception ignored) {}
        try {
            f.setFeature("http://xml.org/sax/features/external-general-entities", false);
            f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        } catch (Exception ignored) {}
        try {
            f.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        } catch (Exception ignored) {}
        f.setXIncludeAware(false);
        javax.xml.parsers.DocumentBuilder builder = f.newDocumentBuilder();
        // Block resolution of external schemaLocation / DTD so 834.xsd etc. do not trigger network calls
        byte[] emptySchema = "<?xml version=\"1.0\"?><xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\"/>".getBytes(StandardCharsets.UTF_8);
        builder.setEntityResolver((publicId, systemId) -> new org.xml.sax.InputSource(new ByteArrayInputStream(emptySchema)));
        // Parse with explicit UTF-8 so parser never misdetects (avoids "Content is not allowed in prolog")
        org.xml.sax.InputSource input = new org.xml.sax.InputSource(new ByteArrayInputStream(xml));
        input.setEncoding(StandardCharsets.UTF_8.name());
        org.w3c.dom.Document doc = builder.parse(input);
        List<String> elementNames = new ArrayList<>();
        org.w3c.dom.Element docRoot = doc.getDocumentElement();
        if (docRoot != null) collectElementNames(docRoot, elementNames);
        Set<String> seen = new LinkedHashSet<>();
        List<Map<String, Object>> tree = new ArrayList<>();
        for (String name : elementNames) {
            if (name == null || name.isEmpty() || !seen.add(name)) continue;
            String key = SAFE_KEY.matcher(name).replaceAll("_");
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("title", name);
            node.put("key", key);
            node.put("isLeaf", true);
            tree.add(node);
        }
        if (tree.isEmpty()) {
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("title", "schema");
            root.put("key", "root");
            root.put("isLeaf", true);
            tree.add(root);
        }
        return tree;
    }

    private static void collectElementNames(org.w3c.dom.Node node, List<String> out) {
        if (node == null) return;
        if (node.getNodeType() != org.w3c.dom.Node.ELEMENT_NODE) return;
        org.w3c.dom.Element el = (org.w3c.dom.Element) node;
        String local = el.getLocalName();
        if ("element".equalsIgnoreCase(local)) {
            String name = el.getAttribute("name");
            if (name != null && !name.isEmpty()) out.add(name);
        }
        org.w3c.dom.NodeList children = node.getChildNodes();
        for (int i = 0; i < children.getLength() && out.size() < MAX_LEAVES; i++) {
            collectElementNames(children.item(i), out);
        }
    }

    /** Build tree from Excel spec: columns Field Name (or Field, Name), Datatype, Requirement (or Required). */
    public static List<Map<String, Object>> fromExcelSpec(InputStream in) throws Exception {
        Workbook wb = WorkbookFactory.create(in);
        Sheet sheet = wb.getSheetAt(0);
        int headerRow = 0;
        Row row0 = sheet.getRow(0);
        if (row0 == null) return Collections.emptyList();
        int fieldCol = -1, datatypeCol = -1, requirementCol = -1;
        for (Cell c : row0) {
            String v = getCellString(c);
            if (v == null) continue;
            String lower = v.trim().toLowerCase();
            if (fieldCol < 0 && (lower.contains("field") || lower.equals("name"))) fieldCol = c.getColumnIndex();
            if (datatypeCol < 0 && (lower.contains("datatype") || lower.contains("data type") || lower.equals("type"))) datatypeCol = c.getColumnIndex();
            if (requirementCol < 0 && (lower.contains("requirement") || lower.contains("required"))) requirementCol = c.getColumnIndex();
        }
        if (fieldCol < 0) fieldCol = 0;
        List<Map<String, Object>> root = new ArrayList<>();
        for (int r = 1; r <= sheet.getLastRowNum() && root.size() < MAX_LEAVES; r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String fieldName = getCellString(row.getCell(fieldCol));
            if (fieldName == null || fieldName.trim().isEmpty()) continue;
            String datatype = datatypeCol >= 0 ? getCellString(row.getCell(datatypeCol)) : null;
            String req = requirementCol >= 0 ? getCellString(row.getCell(requirementCol)) : null;
            String key = SAFE_KEY.matcher(fieldName.trim()).replaceAll("_");
            String title = fieldName.trim();
            if (datatype != null && !datatype.trim().isEmpty()) title += " • " + datatype.trim();
            if (req != null && !req.trim().isEmpty()) title += " • " + req.trim();
            Map<String, Object> leaf = new LinkedHashMap<>();
            leaf.put("title", title);
            leaf.put("key", key);
            leaf.put("isLeaf", true);
            root.add(leaf);
        }
        wb.close();
        return root;
    }

    private static String getCellString(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> String.valueOf((long) c.getNumericCellValue());
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            default -> null;
        };
    }
}
