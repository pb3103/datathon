import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Municipality(Base):
    __tablename__ = "municipality"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    county: Mapped[str] = mapped_column(String(200))
    normalized_name: Mapped[str] = mapped_column(String(200), index=True)
    normalized_county: Mapped[str] = mapped_column(String(200))
    official_code: Mapped[str | None] = mapped_column(String(50))
    code_system: Mapped[str | None] = mapped_column(String(100))
    municipality_type: Mapped[str | None] = mapped_column(String(20))
    __table_args__ = (
        UniqueConstraint("normalized_county", "normalized_name"),
        UniqueConstraint("code_system", "official_code"),
        CheckConstraint("(official_code IS NULL) = (code_system IS NULL)", name="code_system_pair"),
        CheckConstraint(
            "municipality_type IS NULL OR municipality_type IN ('grad', 'opcina')",
            name="municipality_type_valid",
        ),
    )


class SourceDataset(Base):
    __tablename__ = "source_dataset"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(Text)
    path: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str] = mapped_column(String(64))
    year: Mapped[int] = mapped_column(Integer)
    sheet: Mapped[str] = mapped_column(String(200))
    scope: Mapped[str] = mapped_column(String(100), default="public_service")
    methodology_group: Mapped[str] = mapped_column(String(100))
    methodology_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    publisher: Mapped[str | None] = mapped_column(Text)
    catalog_url: Mapped[str | None] = mapped_column(Text)
    resource_url: Mapped[str | None] = mapped_column(Text)
    license: Mapped[str | None] = mapped_column(Text)
    downloaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("sha256", "sheet"),)


class MunicipalityAlias(Base):
    __tablename__ = "municipality_alias"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    municipality_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("municipality.id"))
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("source_dataset.id"))
    source_name: Mapped[str] = mapped_column(String(200))
    source_county: Mapped[str] = mapped_column(String(200))
    resolution: Mapped[str] = mapped_column(Text)
    __table_args__ = (UniqueConstraint("source_id", "source_county", "source_name"),)


class ImportRun(Base):
    __tablename__ = "import_run"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("source_dataset.id"))
    parser_version: Mapped[str] = mapped_column(String(50))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_rows: Mapped[int] = mapped_column(Integer, default=0)
    rejected_rows: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30))
    report: Mapped[dict] = mapped_column(JSONB, default=dict)


class WasteObservation(Base):
    __tablename__ = "waste_observation"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    municipality_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("municipality.id"), index=True)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("source_dataset.id"))
    import_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("import_run.id"))
    year: Mapped[int] = mapped_column(Integer)
    source_row: Mapped[int] = mapped_column(Integer)
    scope: Mapped[str] = mapped_column(String(100), default="public_service")
    total_t: Mapped[Decimal | None] = mapped_column(Numeric(24, 12))
    mixed_t: Mapped[Decimal | None] = mapped_column(Numeric(24, 12))
    covered_population: Mapped[int | None] = mapped_column(Integer)
    published_kg_per_capita: Mapped[Decimal | None] = mapped_column(Numeric(24, 12))
    published_separate_collection_pct: Mapped[Decimal | None] = mapped_column(Numeric(24, 12))
    raw_values: Mapped[dict] = mapped_column(JSONB)
    methodology_group: Mapped[str] = mapped_column(String(100))
    quality_status: Mapped[str] = mapped_column(String(30))
    population_usable: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint("source_id", "source_row"),
        Index(
            "one_active_observation",
            "municipality_id",
            "year",
            "scope",
            unique=True,
            postgresql_where=text("active"),
        ),
        CheckConstraint("total_t IS NULL OR total_t >= 0", name="nonnegative_total"),
        CheckConstraint("mixed_t IS NULL OR mixed_t >= 0", name="nonnegative_mixed"),
        CheckConstraint(
            "total_t IS NULL OR mixed_t IS NULL OR mixed_t <= total_t", name="mixed_le_total"
        ),
        CheckConstraint(
            "covered_population IS NULL OR covered_population > 0", name="positive_population"
        ),
        CheckConstraint(
            "published_separate_collection_pct IS NULL OR published_separate_collection_pct BETWEEN 0 AND 100",
            name="valid_rate",
        ),
    )


class PopulationObservation(Base):
    __tablename__ = "population_observation"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    municipality_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("municipality.id"))
    reference_year: Mapped[int] = mapped_column(Integer)
    population: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(100))
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("source_dataset.id"))
    __table_args__ = (CheckConstraint("population > 0", name="positive_population_observation"),)


class QualityIssue(Base):
    __tablename__ = "quality_issue"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    import_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("import_run.id"))
    observation_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("waste_observation.id"))
    source_row: Mapped[int | None] = mapped_column(Integer)
    code: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(Text)
    details: Mapped[dict] = mapped_column(JSONB, default=dict)


class MaterialObservation(Base):
    __tablename__ = "material_observation"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    municipality_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("municipality.id"), index=True)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("source_dataset.id"))
    import_run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("import_run.id"))
    year: Mapped[int] = mapped_column(Integer)
    source_row: Mapped[int] = mapped_column(Integer)
    material: Mapped[str] = mapped_column(String(30))
    published_kg_per_person: Mapped[Decimal | None] = mapped_column(Numeric(24, 12))
    raw_values: Mapped[dict] = mapped_column(JSONB)
    scope: Mapped[str] = mapped_column(String(100))
    denominator_status: Mapped[str] = mapped_column(String(100))
    evidence: Mapped[dict] = mapped_column(JSONB, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (
        UniqueConstraint("source_id", "source_row", "material"),
        Index(
            "one_active_material",
            "municipality_id",
            "year",
            "material",
            unique=True,
            postgresql_where=text("active"),
        ),
        CheckConstraint(
            "published_kg_per_person IS NULL OR published_kg_per_person >= 0",
            name="nonnegative_material",
        ),
        CheckConstraint(
            "material IN ('paper','plastic','glass','metal','bulky','textile','bio')",
            name="valid_material",
        ),
    )
