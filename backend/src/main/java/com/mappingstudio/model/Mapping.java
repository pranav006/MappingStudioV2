
package com.mappingstudio.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Mapping {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private Long projectId;
    private String source;
    private String target;
    private String logic;
}
