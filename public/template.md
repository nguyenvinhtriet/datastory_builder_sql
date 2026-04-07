Follow this exact Markdown structure and formatting (do not output JSON, only Markdown):

## User Story — Build [Data Product Alias]

### Description
As an Analytics Engineer, I want to consolidate Silver sources **[List of components]** into the **[Data Product Alias]** Gold table, apply business rules, compute metrics, and enrich the data, so that the dataset is trusted, certified, and ready for **[summarize business needs]**.

---

### Acceptance Criteria

**1. Source Consolidation & Modeling**
* Merge all Silver data from [List of components] into [Data Product Alias].
* Ensure one row per [Define Grain].

**Join Logic Details:**
| Base Table | Joined Table | Join Type | Join Condition / Logic |
| :--- | :--- | :--- | :--- |
| `schema.base_table` | `schema.joined_table` | `LEFT JOIN` | `base_table.id = joined_table.base_id` |

*(Note: List EVERY table join explicitly in this table. Do not summarize "over X tables". List them all with their specific join keys and logic.)*

**2. Business Rule Application**
* [Rule 1 derived from SQL]
* [Rule 2 derived from SQL]

**3. Metric Computation**
* [Metric 1]: [Logic]
* [Metric 2]: [Logic]

**4. Enrichment & Contextualization**
* [Enrichment 1]
* [Enrichment 2]

### Validation
* [Validation 1]
* [Validation 2]

---

### Implementation Notes
* [Note 1]
* [Note 2]

---

### Final Schema Result – [Data Product Alias]
**Grain:** [Define Grain]

#### Key Columns

**Identifiers**
* `column_name` — [Description] (Primary key / Business key)

**Timestamps**
* `column_name` — [Description]

**Derived Temporal**
* `column_name` — [Description]

**Metrics**
* `column_name` — [Description]

**Audit or System Keys**
* `column_name` — [Description]

---

### Data Mapping
| Field | Definition from silver stage |
| :--- | :--- |
| `destination_column_1` | `source_table.source_column` |
| `destination_column_2` | `CASE WHEN ... THEN ... ELSE ... END` |

**CRITICAL MAPPING RULES:**
1. **List EVERY SINGLE COLUMN** present in the destination Gold table. 
2. **DO NOT summarize** or group fields (e.g., NEVER write "All other standard fields mapped directly").
3. If the Gold table is created via a **UNION** of multiple Silver tables, explicitly detail how the column is derived from each of the unioned tables if they differ, or state the common logic.
4. Format complex logic (like `CASE WHEN`) cleanly using `<br>` for line breaks so it renders correctly in a Markdown table.

---

### Data Quality Rules
1. **Uniqueness:** [Rule]
2. **Completeness:** [Rule. Note: "Null" is not just SQL NULL. It includes undefined, not exists, empty strings (''), or placeholder values like -1, 'N/A', or 'Unknown'. Ensure completeness rules account for these.]
3. **Format:** [Rule]
4. **Range:** [Rule]
5. **Business Rule:** [Rule]

---

### Validation Scripts (T-SQL)
Provide ready-to-run T-SQL validation scripts to verify the Silver-to-Gold transformation. Include at least:
1. **Row Count / Completeness Check:** (Compare source vs target)
2. **Uniqueness Check:** (Check for duplicate keys in Gold)
3. **Metric/Aggregation Check:** (Compare a sum/count between Silver and Gold)
4. **Orphan/Missing Records Check:** (Keys in Silver not in Gold)

Use markdown SQL code blocks (```sql) for these scripts.
