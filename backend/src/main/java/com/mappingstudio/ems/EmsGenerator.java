package com.mappingstudio.ems;

import com.mappingstudio.mapping.MappingEntity;
import java.util.List;

public interface EmsGenerator {
    byte[] generate(String project, List<MappingEntity> mappings);
}
