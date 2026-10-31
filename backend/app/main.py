from backend.app.simulations import router as simulations_router
from backend.app.comparison import router as comparison_router
from pathlib import Path
from uuid import UUID
from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import exists, func, or_, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from backend.app.config import get_settings
from backend.app.db import get_session
from backend.app.models import (
    Municipality,
    MunicipalityAlias,
    SourceDataset,
    WasteObservation,
)
from backend.app.schemas import (
    MunicipalitiesPage,
    MunicipalityOut,
    ProfileOut,
    SourcesPage,
    YearOut,
    YearsOut,
)
from pipeline.extract import normalize_name
from backend.app.observations import (
    municipality_or_404,
    issues_for,
    comparability,
    observations_for,
    observation_out,
    source_out,
)

app = FastAPI(
    title="WasteWise API",
    version="0.1.0",
    description="Podaci o sakupljanju u javnoj usluzi. Stopa odvojenog sakupljanja nije stopa recikliranja. Decimalne vrijednosti u JSON-u su stringovi radi očuvanja preciznosti.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Accept", "Content-Type"],
)
PREFIX = "/api/v1"


@app.exception_handler(SQLAlchemyError)
def database_error(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": {
                "code": "database_unavailable",
                "message": "Baza ili potrebna shema trenutačno nije dostupna.",
            }
        },
    )


@app.get(PREFIX + "/health/live")
def live():
    return {"status": "ok"}


@app.get(PREFIX + "/health/ready")
def ready(session: Session = Depends(get_session)):
    session.execute(text("SELECT 1"))
    versions = set(session.execute(text("SELECT version_num FROM alembic_version")).scalars())
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    expected = set(ScriptDirectory.from_config(cfg).get_heads())
    if versions != expected or not expected:
        raise HTTPException(503, detail={"code": "migrations_required"})
    counts = dict(
        session.execute(
            select(WasteObservation.year, func.count())
            .where(WasteObservation.active)
            .group_by(WasteObservation.year)
        ).all()
    )
    return {
        "status": "ready",
        "database": "available",
        "migrations": "current",
        "data": {
            "status": "loaded"
            if set(counts).issuperset({2021, 2022, 2023, 2024}) and all(n == 556 for n in counts.values())
            else "empty"
            if not counts
            else "partial",
            "active_rows_by_year": counts,
            "historical_status": "loaded" if all(counts.get(y)==556 for y in range(2017,2021)) else "partial" if any(y in counts for y in range(2017,2021)) else "missing",
        },
    }


@app.get(PREFIX + "/municipalities", response_model=MunicipalitiesPage)
def municipalities(
    q: str = Query("", max_length=200),
    county: str | None = Query(None, max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    filters = []
    if q.strip():
        token = normalize_name(q).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        alias_match = exists(
            select(MunicipalityAlias.id).where(
                MunicipalityAlias.municipality_id == Municipality.id,
                func.lower(MunicipalityAlias.source_name).like("%" + token + "%", escape="\\"),
            )
        )
        filters.append(
            or_(Municipality.normalized_name.like("%" + token + "%", escape="\\"), alias_match)
        )
    if county:
        filters.append(Municipality.normalized_county == normalize_name(county))
    total = session.scalar(select(func.count()).select_from(Municipality).where(*filters))
    items = session.scalars(
        select(Municipality)
        .where(*filters)
        .order_by(Municipality.normalized_name, Municipality.normalized_county, Municipality.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return MunicipalitiesPage(
        items=[MunicipalityOut.model_validate(m) for m in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@app.get(PREFIX + "/municipalities/{municipality_id}/years", response_model=YearsOut)
def years(municipality_id: UUID, session: Session = Depends(get_session)):
    municipality = municipality_or_404(session, municipality_id)
    observations = observations_for(session, municipality_id)
    result = []
    for idx, obs in enumerate(observations):
        source_issues = issues_for(session, obs.source_id)
        result.append(
            YearOut(
                year=obs.year,
                quality_status=obs.quality_status,
                population_usable=obs.population_usable,
                comparability=comparability(
                    obs, observations[idx - 1] if idx else None, source_issues
                ),
            )
        )
    return YearsOut(municipality=MunicipalityOut.model_validate(municipality), years=result)


@app.get(PREFIX + "/municipalities/{municipality_id}/observations", response_model=ProfileOut)
def observations(
    municipality_id: UUID,
    from_year: int = Query(2017, ge=1900, le=2100),
    to_year: int = Query(2024, ge=1900, le=2100),
    session: Session = Depends(get_session),
):
    if from_year > to_year:
        raise HTTPException(422, detail={"code": "invalid_year_range"})
    municipality = municipality_or_404(session, municipality_id)
    rows = observations_for(session, municipality_id)
    return ProfileOut(
        municipality=MunicipalityOut.model_validate(municipality),
        observations=[
            observation_out(session, obs, rows[idx - 1] if idx else None)
            for idx, obs in enumerate(rows)
            if from_year <= obs.year <= to_year
        ],
    )


@app.get(PREFIX + "/sources", response_model=SourcesPage)
def sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    total = session.scalar(select(func.count()).select_from(SourceDataset))
    rows = session.scalars(
        select(SourceDataset)
        .order_by(SourceDataset.year, SourceDataset.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return SourcesPage(
        items=[source_out(session, s) for s in rows], total=total, page=page, page_size=page_size
    )


app.include_router(comparison_router)

app.include_router(simulations_router)
