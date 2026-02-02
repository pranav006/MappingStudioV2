package com.mappingstudio.ai.training;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Config for isolated training import. Used only by the training package
 * to enforce limits and prevent abuse/malware.
 */
@Component
@ConfigurationProperties(prefix = "app.training")
public class TrainingConfig {

    /** Max upload size in bytes (prevents zip bombs / oversized uploads). */
    private long maxFileSizeBytes = 5_242_880L; // 5 MB

    /** Max data rows to process per sheet. */
    private int maxRows = 10_000;

    /** Max columns to read per row. */
    private int maxColumns = 32;

    /** Max length for Source Field value. */
    private int maxSourceLength = 500;

    /** Max length for Target Field value. */
    private int maxTargetLength = 500;

    /** Max length for Mapping Logic value (matches ai_learning.logic column). */
    private int maxLogicLength = 5_000;

    public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
    public void setMaxFileSizeBytes(long maxFileSizeBytes) { this.maxFileSizeBytes = maxFileSizeBytes; }

    public int getMaxRows() { return maxRows; }
    public void setMaxRows(int maxRows) { this.maxRows = maxRows; }

    public int getMaxColumns() { return maxColumns; }
    public void setMaxColumns(int maxColumns) { this.maxColumns = maxColumns; }

    public int getMaxSourceLength() { return maxSourceLength; }
    public void setMaxSourceLength(int maxSourceLength) { this.maxSourceLength = maxSourceLength; }

    public int getMaxTargetLength() { return maxTargetLength; }
    public void setMaxTargetLength(int maxTargetLength) { this.maxTargetLength = maxTargetLength; }

    public int getMaxLogicLength() { return maxLogicLength; }
    public void setMaxLogicLength(int maxLogicLength) { this.maxLogicLength = maxLogicLength; }
}
