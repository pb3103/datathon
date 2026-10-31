import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class MunicipalityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    county: str
    official_code: str | None
    code_system: str | None
    municipality_type: str | None


class MunicipalitiesPage(BaseModel):
    items: list[MunicipalityOut]
    total: int
    page: int
    page_size: int


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    severity: str
    description: str
    details: dict


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    path: str
    sha256: str
    year: int
    sheet: str
    scope: str
    methodology_group: str
    methodology_verified: bool
    publisher: str | None
    catalog_url: str | None
    resource_url: str | None
    license: str | None
    downloaded_at: datetime | None
    issues: list[IssueOut] = Field(default_factory=list)


class SourcesPage(BaseModel):
    items: list[SourceOut]
    total: int
    page: int
    page_size: int


class Metric(BaseModel):
    # Decimal is emitted as a JSON string to preserve precision.
    value: Decimal | None
    unit: str
    reason: str | None = None
    quality_status: str = "available"


class Comparability(BaseModel):
    status: str = "provisional"
    methodology_group: str
    previous_year: int | None = None
    population_changed: bool | None = None
    reasons: list[str]


class ObservationOut(BaseModel):
    id: uuid.UUID
    year: int
    scope: str
    source_row: int
    source: SourceOut
    quality_status: str
    population_usable: bool
    raw_values: dict
    metrics: dict[str, Metric]
    issues: list[IssueOut]
    comparability: Comparability
    target_rate_available: bool
    target_rate_unavailable_reason: str | None


class ProfileOut(BaseModel):
    municipality: MunicipalityOut
    observations: list[ObservationOut]


class YearOut(BaseModel):
    year: int
    quality_status: str
    population_usable: bool
    comparability: Comparability


class YearsOut(BaseModel):
    municipality: MunicipalityOut
    years: list[YearOut]


class MaterialOut(BaseModel):
    material: str
    label: str
    published: Metric
    comparable: Metric
    source: SourceOut
    source_row: int
    denominator_status: str
    cross_year_verified: bool = False
    evidence: dict


class PeerOut(BaseModel):
    municipality: MunicipalityOut
    covered_population: int
    population_ratio: Decimal
    log_distance: Decimal
    within_preferred_range: bool
    quality_notes: list[str]


class PeersOut(BaseModel):
    baseline: MunicipalityOut
    year: int
    algorithm_version: str
    county_scope: str
    status: str
    reason: str | None = None
    preferred_min: Decimal = Decimal("0.5")
    preferred_max: Decimal = Decimal("2")
    expanded: bool
    eligible_candidates: int
    exclusions: dict[str, int]
    items: list[PeerOut]
    warnings: list[str]


class CompareMetric(BaseModel):
    key: str
    label: str
    unit: str
    difference_unit: str
    family: str


class CompareMember(BaseModel):
    municipality: MunicipalityOut
    observation: ObservationOut | None
    history: list[ObservationOut]
    metrics: dict[str, Metric]
    differences: dict[str, Metric]
    materials: list[MaterialOut]
    material_history: dict[int, list[MaterialOut]]
    history_metrics: dict[int, dict[str, Metric]]
    warnings: list[str]
    simulation_url: str | None
    population_ratio: Decimal | None


class DifferenceInsight(BaseModel):
    metric: str
    label: str
    year: int
    unit: str
    difference_unit: str
    low_municipality: MunicipalityOut
    high_municipality: MunicipalityOut
    low_value: Decimal
    high_value: Decimal
    difference: Decimal
    relative_range: Decimal
    available_count: int


class ComparisonOut(BaseModel):
    baseline_id: uuid.UUID
    year: int
    metrics: list[CompareMetric]
    members: list[CompareMember]
    insights: list[DifferenceInsight]
    insight_method: str
    insight_exclusions: list[str]
    warnings: list[str]
