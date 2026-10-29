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
